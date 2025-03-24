import { AuthTest } from "@/components/tests/AuthTest";

export default function AuthTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Authentication Test Page</h1>
      <p className="text-center mb-6 text-gray-600">
        This page allows testing the consolidated authentication service
      </p>
      <div className="max-w-md mx-auto">
        <AuthTest />
      </div>
    </div>
  );
}