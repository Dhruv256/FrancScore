import { MockTestSimulatorClient } from "@/components/mocks/MockTestSimulatorClient";
import { getAuthContext } from "@/lib/auth";
import { getAvailableMockTests } from "@/lib/mocks/server";

export default async function MockTestsPage() {
  const { user } = await getAuthContext();

  if (!user) {
    return null;
  }

  const tests = await getAvailableMockTests(user.id);
  return <MockTestSimulatorClient tests={tests} />;
}
