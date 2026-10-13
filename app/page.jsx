import { getChatGPTUser } from './chatgpt-auth';
import SchoolApp from './school-app';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await getChatGPTUser();
  return <SchoolApp identity={user ? { name: user.displayName, email: user.email } : null} />;
}
