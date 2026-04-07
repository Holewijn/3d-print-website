"use client";
import { useEffect } from "react";
export default function AdminIndex() {
  useEffect(() => { location.href = "/admin/dashboard/"; }, []);
  return null;
}
