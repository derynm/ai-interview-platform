import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="text-center space-y-3">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          This page doesn't exist. Check the link you followed.
        </p>
        <Link to="/" className="text-sm text-primary hover:underline">
          Go to the home page
        </Link>
      </div>
    </div>
  );
}
