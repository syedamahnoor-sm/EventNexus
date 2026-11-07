const mongoose = require('mongoose');
const objectId = { type: mongoose.Schema.Types.ObjectId, required: true };
const user = new mongoose.Schema({
  id: objectId, email: { type: String, required: true }, role: { type: String, required: true },
  name: { type: String, required: true }, fingerprint: { type: String, required: true },
}, { _id: false, strict: 'throw' });
const event = new mongoose.Schema({ id: objectId, key: { type: String, required: true } }, { _id: false, strict: 'throw' });
const registration = new mongoose.Schema({ id: objectId, student: objectId, event: objectId }, { _id: false, strict: 'throw' });
const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  version: { type: Number, required: true, enum: [1] },
  users: { type: [user], required: true },
  events: { type: [event], required: true },
  registrations: { type: [registration], required: true },
  demoLoginEnabled: { type: Boolean, required: true },
}, { timestamps: true, strict: 'throw', collection: 'development_seed_manifests' });
module.exports = mongoose.model('DevelopmentSeedManifest', schema);
