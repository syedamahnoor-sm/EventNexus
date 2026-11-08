import { answerDisplay } from '../lib/registrationQuestions';
import './RegistrationQuestions.css';

export function QuestionAnswerReview({ questions, values }) {
  if (!questions.length) return null;
  return <section className="registration-answer-review" aria-label="Review event-specific answers"><h3>For this experience.</h3><dl className="registration-review">{questions.map(question => <div key={question.id}><dt>{question.text}</dt><dd>{answerDisplay(question, values[question.id])}</dd></div>)}</dl></section>;
}
export default function RegistrationAnswerSummary({ answers }) {
  if (!answers?.length) return null;
  return <section className="registration-saved-answers" aria-labelledby="saved-answers-title"><h3 id="saved-answers-title">What you shared.</h3><p>Your submitted responses, with the questions as they were when you registered.</p><dl>{answers.map(answer => <div key={answer.questionId}><dt>{answer.questionText}</dt><dd>{answer.answerText || answer.selectedOptions?.map(option => option.label).join(', ')}</dd></div>)}</dl></section>;
}
