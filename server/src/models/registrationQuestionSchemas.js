const mongoose = require('mongoose');
const { TYPES, CHOICE_TYPES, questionsSchema } = require('../validators/registrationQuestions');
const { UUID } = require('../utils/eventManagement');
const text = max => ({ type: String, trim: true, required: true, maxlength: max, validate: value => value.length > 0 && !/[<>]/.test(value) });
const optionSchema = new mongoose.Schema({ id: { type: String, required: true, match: UUID }, label: text(100) }, { _id: false, strict: 'throw' });
const definitionSchema = new mongoose.Schema({ id: { type: String, required: true, match: UUID }, text: text(240), type: { type: String, enum: TYPES, required: true }, required: { type: Boolean, required: true }, order: { type: Number, min: 0, max: 9, required: true, validate: Number.isInteger }, options: { type: [optionSchema], required: true } }, { _id: false, strict: 'throw' });
const snapshotSchema = new mongoose.Schema({ questionId: { type: String, match: UUID, required: true }, questionText: text(240), questionType: { type: String, enum: TYPES, required: true }, required: { type: Boolean, required: true }, order: { type: Number, min: 0, max: 9, required: true, validate: Number.isInteger }, answerText: { type: String, trim: true, maxlength: 1000, validate: value => !value || !/[<>]/.test(value) }, selectedOptions: { type: [optionSchema], default: undefined } }, { _id: false, strict: 'throw' });
const definitionsValid = value => questionsSchema.safeParse((value || []).map(item => item.toObject ? item.toObject() : item)).success;
function snapshotsValid(value) {
    if (!value) return true;
    if (value.length > 10 || new Set(value.map(item => item.questionId)).size !== value.length || new Set(value.map(item => item.order)).size !== value.length) return false;
    return value.every(item => CHOICE_TYPES.includes(item.questionType)
        ? !item.answerText && item.selectedOptions?.length >= 1 && item.selectedOptions.length <= (item.questionType === 'multiple_choice' ? 8 : 1) && new Set(item.selectedOptions.map(option => option.id)).size === item.selectedOptions.length
        : Boolean(item.answerText?.trim()) && item.answerText.length <= (item.questionType === 'short_text' ? 200 : 1000) && !item.selectedOptions?.length);
}
module.exports = { definitionSchema, snapshotSchema, definitionsValid, snapshotsValid };
