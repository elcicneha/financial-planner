import { redirect } from 'next/navigation';

// Default tab is "Other Info" - hardcoded to avoid client/server boundary issues
const DEFAULT_TAB_HREF = '/itr-prep/other-info';

export default function ITRPrepPage() {
  redirect(DEFAULT_TAB_HREF);
}
