import { Outlet, useParams } from "react-router-dom";
import NotFoundPage from "@/pages/NotFoundPage";

// Assessor URLs carry database ids; a non-numeric id would otherwise reach the API as NaN.
export default function NumericParamsRoute() {
  const params = useParams();
  const valid = Object.values(params).every((value) => value === undefined || /^\d+$/.test(value));
  return valid ? <Outlet /> : <NotFoundPage />;
}
