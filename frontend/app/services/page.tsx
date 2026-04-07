import { getPage } from "../../lib/getPage";
import BlockRenderer from "../../components/blocks/BlockRenderer";

export default async function Page() {
  const page = await getPage("services");
  return (
    <>
      {page && (
        <div className="page-header">
          <div className="container">
            <h1>{page.title}</h1>
          </div>
        </div>
      )}
      <BlockRenderer blocks={page?.content?.blocks || []} />
    </>
  );
}

export async function generateMetadata() {
  const page = await getPage("services");
  return { title: page?.seoTitle || page?.title, description: page?.seoDesc };
}
