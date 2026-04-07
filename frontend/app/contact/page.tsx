import { getPage } from "../../lib/getPage";
import BlockRenderer from "../../components/blocks/BlockRenderer";
import ContactForm from "./ContactForm";

export default async function ContactPage() {
  const page = await getPage("contact");
  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>{page?.title || "Get in Touch"}</h1>
          <p>Questions about a project? Drop us a message.</p>
        </div>
      </div>
      <BlockRenderer blocks={page?.content?.blocks || []} />
      <ContactForm />
    </>
  );
}

export async function generateMetadata() {
  const page = await getPage("contact");
  return { title: page?.seoTitle || page?.title, description: page?.seoDesc };
}
