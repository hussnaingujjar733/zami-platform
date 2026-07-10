import { Suspense } from "react";

import { LoginClient } from "../../components/zami/LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
