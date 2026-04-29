import { Construction } from "lucide-react";

interface Props {
  title: string;
  description: string;
  comingItems?: string[];
}

export default function PlaceholderPage({ title, description, comingItems }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-lg border bg-card p-10 text-center space-y-4">
        <Construction className="h-10 w-10 mx-auto text-muted-foreground" />
        <div>
          <div className="font-medium">Em construção</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Esta área está sendo preparada na próxima fase. A estrutura, papéis e fluxos já
            foram definidos.
          </p>
        </div>
        {comingItems && comingItems.length > 0 && (
          <div className="text-left max-w-md mx-auto pt-4 border-t">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              O que vai vir aqui
            </div>
            <ul className="text-sm space-y-1.5">
              {comingItems.map((it) => (
                <li key={it} className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
