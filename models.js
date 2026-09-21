import mongoose from 'mongoose';

const ProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'QniverseUser', unique: true, index: true, required: true },
  xp: { type: Number, default: 0 },
  lessons: { type: Object, default: {} },
  challenges: { type: Object, default: {} },
  streak: { type: Number, default: 0 },
  last: { type: Date, default: null },
}, { timestamps: true });

export const Progress = mongoose.models.QniverseProgress || mongoose.model('QniverseProgress', ProgressSchema);

const UserSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '', maxlength: 80 },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  onboardingComplete: { type: Boolean, default: false },
  learnerLevel: { type: String, enum: ['curious', 'foundation', 'intermediate', 'advanced', 'research'], default: 'curious' },
  learnerProfile: { type: mongoose.Schema.Types.Mixed, default: null },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

export const User = mongoose.models.QniverseUser || mongoose.model('QniverseUser', UserSchema);

const AssessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'QniverseUser', unique: true, index: true, required: true },
  version: { type: Number, default: 1 },
  score: { type: Number, default: 0 },
  level: { type: String, required: true },
  answers: { type: Object, default: {} },
  dimensions: { type: Object, default: {} },
  goals: { type: [String], default: [] },
  recommendedPath: { type: [String], default: [] },
}, { timestamps: true });

export const LearnerAssessment = mongoose.models.QniverseLearnerAssessment || mongoose.model('QniverseLearnerAssessment', AssessmentSchema);
