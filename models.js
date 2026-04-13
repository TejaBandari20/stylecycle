// models.js

const mongoose = require('mongoose');

const Users = mongoose.model('Users', new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
}), 'Users');

const LeaderBoard = mongoose.model('LeaderBoard', new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    location: { type: String, required: true },
    dataset: { type: String, required: true },
    language: { type: String, required: true },
    scores: { type: mongoose.Schema.Types.Mixed, required: true },
}), 'LeaderBoard');

const embeddedClaimSchema = new mongoose.Schema({
    claimerName: { type: String, required: true },
    claimerMobile: { type: String, required: true },
    claimerEmail: { type: String, required: true },
    claimerAddress: { type: String, required: true },
    claimerState: { type: String, required: true },
    claimedAt: { type: Date, default: Date.now }
});

const standaloneClaimSchema = new mongoose.Schema({
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventSubmission', required: true },
    claimerName: { type: String, required: true },
    claimerMobile: { type: String, required: true },
    claimerEmail: { type: String, required: true },
    claimerAddress: { type: String, required: true },
    claimerState: { type: String, required: true },
    claimedAt: { type: Date, default: Date.now }
});

const Claim = mongoose.model('Claim', standaloneClaimSchema, 'Claims');

// Updated EventSubmission Schema
const EventSubmission = mongoose.model('EventSubmission', new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    category: { type: String, required: true, enum: ['Men', 'Women', 'Kids', 'Accessories'] },
    type: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: {
        data: { type: Buffer, required: true },
        contentType: { type: String, required: true }
    },
    claims: [embeddedClaimSchema],
    isClaimed: { type: Boolean, default: false },
    isRestricted: { type: Boolean, default: false } // NEW FIELD: for soft delete/restriction
}, { timestamps: true }), 'EventSubmissions');

module.exports = { Users, LeaderBoard, EventSubmission, Claim };