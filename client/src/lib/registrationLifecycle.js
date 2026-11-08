export const activeRegistration = record => Boolean(record && (record.status == null || record.status === 'active'));
export function registrationStatus(record) {
  return record?.status === 'cancelled_by_organizer' ? 'Cancelled by organizer' : record?.status === 'cancelled_by_student' ? 'Cancelled by student' : activeRegistration(record) ? 'Active registration' : 'Status unavailable';
}
export function organizerCanCancel(event, record, now = Date.now()) { return activeRegistration(record) && event?.status === 'upcoming' && new Date(event.date).getTime() > now; }
