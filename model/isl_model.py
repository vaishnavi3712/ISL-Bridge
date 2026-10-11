import torch
import torch.nn as nn

SEQ_LEN = 30      # frames per sign
FEATS = 126       # 2 hands x 21 points x (x, y, z)


class ISLNet(nn.Module):
    """BiLSTM front end -> Transformer encoder -> attention pooling -> classifier."""

    def __init__(self, n_classes, hidden=128, heads=4, layers=2, drop=0.3):
        super().__init__()
        self.lstm = nn.LSTM(FEATS, hidden, batch_first=True, bidirectional=True)
        d = hidden * 2
        self.pos = nn.Parameter(torch.zeros(1, SEQ_LEN, d))
        enc = nn.TransformerEncoderLayer(d, heads, d * 2, drop, batch_first=True)
        self.encoder = nn.TransformerEncoder(enc, layers)
        self.score = nn.Linear(d, 1)
        self.head = nn.Sequential(nn.LayerNorm(d), nn.Dropout(drop), nn.Linear(d, n_classes))

    def forward(self, x):
        h, _ = self.lstm(x)
        h = self.encoder(h + self.pos[:, : h.size(1)])
        w = torch.softmax(self.score(h), dim=1)
        return self.head((w * h).sum(1))
