"""
P1-203: LSTM Autoencoder Anomali Tespit Modeli
- PyTorch: Encoder(LSTM→64 hidden) + Decoder(LSTM→input_size)
- Reconstruction error > threshold = anomali
- 50 epoch, batch_size=32
"""

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "saved"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class LSTMAutoencoder(nn.Module):
    def __init__(self, input_size: int, hidden_size: int = 64):
        super().__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size

        # Encoder
        self.encoder = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=1,
            batch_first=True,
        )

        # Decoder
        self.decoder = nn.LSTM(
            input_size=hidden_size,
            hidden_size=hidden_size,
            num_layers=1,
            batch_first=True,
        )

        self.output_layer = nn.Linear(hidden_size, input_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Encode
        _, (hidden, cell) = self.encoder(x)

        # Decode: hidden state'i sequence boyunca tekrarla
        seq_len = x.size(1)
        decoder_input = hidden.squeeze(0).unsqueeze(1).repeat(1, seq_len, 1)
        decoder_output, _ = self.decoder(decoder_input, (hidden, cell))

        # Output projection
        reconstruction = self.output_layer(decoder_output)
        return reconstruction


class LSTMAnomalyDetector:
    def __init__(
        self,
        input_size: int,
        hidden_size: int = 64,
        epochs: int = 50,
        batch_size: int = 32,
        learning_rate: float = 0.001,
        threshold_percentile: float = 95.0,
    ):
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.epochs = epochs
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.threshold_percentile = threshold_percentile
        self.threshold = None

        self.model = LSTMAutoencoder(input_size, hidden_size).to(DEVICE)
        self.criterion = nn.MSELoss(reduction="none")

    def fit(self, X_train: np.ndarray) -> "LSTMAnomalyDetector":
        """Normal veriler uzerinde egit (unsupervised)."""
        X_tensor = torch.FloatTensor(X_train).to(DEVICE)
        dataset = TensorDataset(X_tensor, X_tensor)
        loader = DataLoader(dataset, batch_size=self.batch_size, shuffle=True)

        optimizer = torch.optim.Adam(self.model.parameters(), lr=self.learning_rate)

        self.model.train()
        print(f"LSTM Autoencoder egitiliyor... ({self.epochs} epoch)")

        for epoch in range(self.epochs):
            total_loss = 0.0
            for batch_x, _ in loader:
                optimizer.zero_grad()
                reconstruction = self.model(batch_x)
                loss = self.criterion(reconstruction, batch_x).mean()
                loss.backward()
                optimizer.step()
                total_loss += loss.item()

            avg_loss = total_loss / len(loader)
            if (epoch + 1) % 10 == 0:
                print(f"  Epoch {epoch+1}/{self.epochs} - Loss: {avg_loss:.6f}")

        # Threshold hesapla: train verisinin reconstruction error'lari uzerinden
        self.model.eval()
        with torch.no_grad():
            train_recon = self.model(X_tensor)
            errors = self.criterion(train_recon, X_tensor).mean(dim=(1, 2)).cpu().numpy()
            self.threshold = float(np.percentile(errors, self.threshold_percentile))
            print(f"Threshold ({self.threshold_percentile}. percentile): {self.threshold:.6f}")

        return self

    def predict(self, X: np.ndarray) -> dict:
        """Tahmin yap."""
        self.model.eval()
        X_tensor = torch.FloatTensor(X).to(DEVICE)

        with torch.no_grad():
            reconstruction = self.model(X_tensor)
            errors = self.criterion(reconstruction, X_tensor).mean(dim=(1, 2)).cpu().numpy()

        # Reconstruction error'u 0-1 anomali skoruna cevir
        max_error = max(errors.max(), self.threshold * 2)
        anomaly_scores = np.clip(errors / max_error, 0, 1)
        is_anomaly = errors > self.threshold

        return {
            "reconstruction_errors": errors,
            "anomaly_scores": anomaly_scores,
            "is_anomaly": is_anomaly,
        }

    def predict_single(self, x: np.ndarray) -> dict:
        """Tek ornek icin tahmin."""
        if x.ndim == 2:
            x = x.reshape(1, *x.shape)
        result = self.predict(x)
        return {
            "is_anomaly": bool(result["is_anomaly"][0]),
            "anomaly_score": float(result["anomaly_scores"][0]),
            "reconstruction_error": float(result["reconstruction_errors"][0]),
        }

    def save(self, path: Path | None = None):
        """Modeli kaydet."""
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        save_path = path or MODELS_DIR / "lstm_autoencoder.pth"
        torch.save(
            {
                "model_state_dict": self.model.state_dict(),
                "input_size": self.input_size,
                "hidden_size": self.hidden_size,
                "threshold": self.threshold,
            },
            save_path,
        )
        print(f"Model kaydedildi: {save_path}")

    def load(self, path: Path | None = None) -> "LSTMAnomalyDetector":
        """Modeli yukle."""
        load_path = path or MODELS_DIR / "lstm_autoencoder.pth"
        checkpoint = torch.load(load_path, map_location=DEVICE, weights_only=True)
        self.input_size = checkpoint["input_size"]
        self.hidden_size = checkpoint["hidden_size"]
        self.threshold = checkpoint["threshold"]
        self.model = LSTMAutoencoder(self.input_size, self.hidden_size).to(DEVICE)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()
        print(f"Model yuklendi: {load_path}")
        return self


def train_lstm_autoencoder(X_train: np.ndarray, input_size: int) -> LSTMAnomalyDetector:
    """LSTM Autoencoder'i egit ve kaydet."""
    detector = LSTMAnomalyDetector(input_size=input_size)
    detector.fit(X_train)
    detector.save()
    return detector


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from data_prep import prepare_dataset

    dataset = prepare_dataset()
    detector = train_lstm_autoencoder(
        dataset["X_train"], dataset["feature_count"]
    )

    # Test
    result = detector.predict(dataset["X_test"])
    anomaly_rate = result["is_anomaly"].mean()
    print(f"\nTest seti anomali orani: {anomaly_rate:.2%}")
    print(f"Ortalama reconstruction error: {result['reconstruction_errors'].mean():.6f}")
