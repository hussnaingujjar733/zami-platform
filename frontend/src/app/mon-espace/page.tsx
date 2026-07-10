import { Suspense } from "react";

import { MonEspaceClient } from "../../components/zami/MonEspaceClient";

export default function MonEspacePage() {
  return (
    <Suspense fallback={null}>
      <MonEspaceClient />
    </Suspense>
  );
}
