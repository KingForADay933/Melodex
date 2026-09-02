import { FlagIcon } from './icons'

// mailto fallback until a Tally/Google Form exists to point this at instead
// — swapping to a form is a one-line change to this one constant.
const FEEDBACK_EMAIL = 'darius.williams.business@gmail.com'
const FEEDBACK_HREF = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Melodex feedback')}&body=${encodeURIComponent(
  'What were you doing?\n\nWhat happened?\n\nDevice/browser:\n',
)}`

/** Discrete "report a bug" link shown on every screen's header, so a tester
 * can flag something the moment it happens instead of losing context by
 * leaving the app to find an email address. */
export function FeedbackButton() {
  return (
    <a
      href={FEEDBACK_HREF}
      aria-label="Report an issue or send feedback"
      title="Report an issue or send feedback"
      className="flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-accent-soft"
    >
      <FlagIcon className="h-4 w-4" />
    </a>
  )
}
