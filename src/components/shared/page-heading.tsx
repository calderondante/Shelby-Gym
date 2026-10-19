import Link from "next/link";
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  back,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="page-heading">
      {back ? (
        <Link className="back-link" href={back.href}>
          ← {back.label}
        </Link>
      ) : null}
      <div className="heading-row">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {description ? (
            <p className="page-description">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}
