"""Continual update of the global model from feedback landmarks (no video is ever stored).

Run:  python continual/update.py
Uses a replay buffer of old samples plus an EWC-style penalty so that learning
new corrections does not wipe out earlier signs.
"""
import json, os, sqlite3, sys
import numpy as np
import torch
import torch.nn as nn

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from model.isl_model import ISLNet, SEQ_LEN

MDIR = os.path.join(ROOT, "model")
labels = json.load(open(os.path.join(MDIR, "labels.json"), encoding="utf8"))
net = ISLNet(len(labels))
net.load_state_dict(torch.load(os.path.join(MDIR, "isl_model.pt"), map_location="cpu"))

rows = sqlite3.connect(os.path.join(ROOT, "islbridge.db")).execute("select label, seq from feedback").fetchall()
X, Y = [], []
for lab, seq in rows:
    if lab in labels:
        a = np.array(json.loads(seq), dtype=np.float32)
        X.append(a[np.linspace(0, len(a) - 1, SEQ_LEN).round().astype(int)])
        Y.append(labels.index(lab))
if len(X) < 5:
    sys.exit(f"only {len(X)} usable feedback samples, need at least 5")
X, Y = torch.tensor(np.stack(X)), torch.tensor(Y)

# replay buffer saved by the notebook (optional)
rp = os.path.join(MDIR, "replay.pt")
if os.path.exists(rp):
    r = torch.load(rp)
    X, Y = torch.cat([X, r["x"]]), torch.cat([Y, r["y"]])

old = {n: p.detach().clone() for n, p in net.named_parameters()}
fisher = {n: torch.zeros_like(p) for n, p in net.named_parameters()}
net.train()
for i in range(min(len(X), 64)):  # rough diagonal Fisher estimate
    net.zero_grad()
    nn.functional.cross_entropy(net(X[i:i + 1]), Y[i:i + 1]).backward()
    for n, p in net.named_parameters():
        if p.grad is not None:
            fisher[n] += p.grad.pow(2) / min(len(X), 64)

opt = torch.optim.AdamW(net.parameters(), lr=1e-4)
for ep in range(15):
    perm = torch.randperm(len(X))
    for b in range(0, len(X), 16):
        idx = perm[b:b + 16]
        loss = nn.functional.cross_entropy(net(X[idx]), Y[idx])
        loss = loss + 100 * sum((fisher[n] * (p - old[n]).pow(2)).sum() for n, p in net.named_parameters())
        opt.zero_grad(); loss.backward(); opt.step()
torch.save(net.state_dict(), os.path.join(MDIR, "isl_model.pt"))
print("model updated with", len(rows), "feedback samples")
