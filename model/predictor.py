import json, os
import numpy as np
import torch
from .isl_model import ISLNet, SEQ_LEN, FEATS

# Word signs (labels longer than one character) are favoured over letters and digits:
# their probabilities are multiplied by WORD_BOOST before ranking. 1 = off. Set the WORD_BOOST environment variable to change it.
WORD_BOOST = float(os.environ.get("WORD_BOOST", "3"))


class Predictor:
    def __init__(self, folder):
        w, l = os.path.join(folder, "isl_model.pt"), os.path.join(folder, "labels.json")
        self.ready = os.path.exists(w) and os.path.exists(l)
        if not self.ready:
            return
        with open(l, encoding="utf8") as f:
            self.labels = json.load(f)
        self.boost = torch.tensor([WORD_BOOST if len(x) > 1 else 1.0 for x in self.labels])
        self.net = ISLNet(len(self.labels))
        self.net.load_state_dict(torch.load(w, map_location="cpu"))
        self.net.eval()

    def _prep(self, seq):
        a = np.asarray(seq, dtype=np.float32)
        if a.ndim != 2 or a.shape[1] != FEATS or len(a) < 4 or len(a) > 300:
            raise ValueError("bad sequence shape")
        return torch.from_numpy(a[np.linspace(0, len(a) - 1, SEQ_LEN).round().astype(int)])

    def _probs(self, seq):
        return torch.softmax(self.net(self._prep(seq)[None]), 1)[0]

    def _top(self, p, k):
        # words are ranked higher (WORD_BOOST) but the reported confidence is the RAW probability,
        # so the website's thresholds are not distorted by the boost
        order = (p * self.boost).topk(min(k, len(self.labels))).indices
        return [{"label": self.labels[j], "conf": round(float(p[j]), 3)} for j in order]

    @torch.no_grad()
    def predict(self, seq, k=3):
        return self._top(self._probs(seq), k)

    @torch.no_grad()
    def predict_multi(self, seqs, k=3):
        """Several windows of the same moment (short and long): keep each sign's best probability."""
        batch = torch.stack([self._prep(s) for s in seqs])          # all windows in ONE forward pass
        p = torch.softmax(self.net(batch), 1).max(0).values
        return self._top(p, k)
