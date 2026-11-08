import './RegistrationQuestions.css';

export default function RegistrationQuestionFields({ questions, values, onChange, errors, disabled }) {
  if (!questions.length) return null;
  return <section className="registration-custom-questions" aria-labelledby="registration-custom-title"><p className="eyebrow">A LITTLE MORE / FOR THIS EXPERIENCE</p><h3 id="registration-custom-title">A few things to know.</h3><p className="question-privacy-note">Only share what this event needs. Never include passwords, government IDs or financial details. Your responses are saved with your registration and available to this event’s organizer.</p>
    {errors.answers && <p className="registration-field-error" role="alert">{errors.answers}</p>}
    {questions.map((question, index) => {
      const id = `registration-question-${question.id}`, error = errors[`answers.${question.id}`], value = values[question.id] ?? (question.type === 'multiple_choice' ? [] : '');
      const description = error ? `${id}-error` : `${id}-hint`;
      const label = <>{index + 1}. {question.text} <span>{question.required ? '(required)' : '(optional)'}</span></>;
      const inputProps = { id, value, disabled, required: question.required, 'aria-invalid': Boolean(error), 'aria-describedby': description };
      return <div className="registration-custom-field" key={question.id}>
        {question.type === 'single_choice' || question.type === 'multiple_choice' ? <fieldset disabled={disabled} className="registration-choice-group" tabIndex={-1} aria-invalid={Boolean(error)} aria-describedby={description}><legend>{label}</legend>{question.options.map(option => <label key={option.id}><input type={question.type === 'multiple_choice' ? 'checkbox' : 'radio'} name={id} value={option.id} checked={question.type === 'multiple_choice' ? value.includes(option.id) : value === option.id} onChange={e => onChange(question.id, question.type === 'multiple_choice' ? e.target.checked ? [...value, option.id] : value.filter(item => item !== option.id) : option.id)} /><span>{option.label}</span></label>)}{!question.required && question.type === 'single_choice' && value && <button type="button" className="text-link question-clear" onClick={() => onChange(question.id, '')}>Clear selection</button>}</fieldset> : <><label htmlFor={id}>{label}</label>{question.type === 'dropdown' ? <select {...inputProps} onChange={e => onChange(question.id, e.target.value)}><option value="">Choose an option</option>{question.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select> : question.type === 'long_text' ? <textarea {...inputProps} maxLength={1000} rows={4} onChange={e => onChange(question.id, e.target.value)} /> : <input {...inputProps} type="text" maxLength={200} autoComplete="off" onChange={e => onChange(question.id, e.target.value)} />}</>}
        <p id={`${id}-hint`} className="registration-field-hint">{question.type === 'multiple_choice' ? 'Choose all that apply.' : question.type === 'short_text' ? 'Plain text, up to 200 characters.' : question.type === 'long_text' ? 'Plain text, up to 1000 characters.' : 'Choose one option.'}</p>
        {error && <p id={`${id}-error`} className="registration-field-error">{error}</p>}
      </div>;
    })}
  </section>;
}
