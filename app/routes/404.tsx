import type { MetaFunction } from "@remix-run/node";
import NotFound from "~/components/NotFound";

export const meta: MetaFunction = () => [
  { title: "ページが見つかりません - MOFUCRAFT!!!" }
];

export default function Custom404() {
  return <NotFound />;
}