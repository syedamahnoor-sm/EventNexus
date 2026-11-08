import { QUESTION_TYPES } from '../lib/registrationQuestions';
export default function QuestionDefinitionSummary({ questions }) {
  if (!questions?.length) return <p>No custom questions. Standard student details only.</p>;
  return <ol className="question-definition-summary">{questions.map(question => <li key={question.id}><strong>{question.text}</strong><span>{QUESTION_TYPES.find(type => type.value === question.type)?.label} · {question.required ? 'Required' : 'Optional'}</span>{question.options.length > 0 && <small>{question.options.map(option => option.label).join(' / ')}</small>}</li>)}</ol>;
}
