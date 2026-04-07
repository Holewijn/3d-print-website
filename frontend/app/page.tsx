import { getPage } from "../lib/getPage";
import BlockRenderer from "../components/blocks/BlockRenderer";

export default async function Home() {
  const page = await getPage("home");
  return <BlockRenderer blocks={page?.content?.blocks || []} />;
}

export async function generateMetadata() {
  const page = await getPage("home");
  return { title: page?.seoTitle || page?.title || "3D Print Studio", description: page?.seoDesc };
}
