# Custom Waste Model

Export your trained TensorFlow.js or Teachable Machine image model into this folder.

Required files:

- `model.json`
- `metadata.json`
- Binary weight files generated with the model export

Recommended class labels:

- `plastic`
- `metal`
- `paper`
- `organic`
- `glass`

If you host the model somewhere else, set these values in `.env`:

- `CUSTOM_MODEL_URL`
- `CUSTOM_METADATA_URL`
