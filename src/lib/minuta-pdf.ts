import jsPDF from "jspdf";

export interface MinutaCedente {
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

export interface MinutaRepresentante {
  nome: string;
  nacionalidade?: string | null;
  estado_civil?: string | null;
  cpf?: string | null;
  rg?: string | null;
  orgao_emissor?: string | null;
  endereco_logradouro?: string | null;
  endereco_numero?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_estado?: string | null;
  endereco_cep?: string | null;
  qualificacao?: string | null;
}

export interface MinutaFiador {
  nome: string;
  cpf?: string | null;
  qualificacao?: string | null;
}

export interface MinutaData {
  cedente: MinutaCedente;
  representantes: MinutaRepresentante[];
  fiadores: MinutaFiador[];
  proposta?: {
    codigo?: string | null;
    valor_aprovado: number | null;
    prazo_dias: number | null;
    taxa_sugerida: number | null;
    finalidade?: string | null;
    garantias?: string | null;
    decided_at?: string | null;
  } | null;
}

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const todayLong = () => {
  const d = new Date();
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
};

const enderecoCedente = (c: MinutaCedente) => {
  const partes: string[] = [];
  const linha1 = [c.logradouro ?? c.endereco, c.numero].filter(Boolean).join(", ");
  if (linha1) partes.push(linha1);
  if (c.bairro) partes.push(c.bairro);
  const cid = c.cidade && c.estado ? `${c.cidade}/${c.estado}` : (c.cidade ?? c.estado ?? "");
  if (cid) partes.push(cid);
  if (c.cep) partes.push(`CEP ${c.cep}`);
  return partes.filter(Boolean).join(", ");
};

const enderecoRep = (r: MinutaRepresentante) => {
  const partes: string[] = [];
  const linha1 = [r.endereco_logradouro, r.endereco_numero].filter(Boolean).join(", ");
  if (linha1) partes.push(linha1);
  if (r.endereco_bairro) partes.push(r.endereco_bairro);
  const cid = r.endereco_cidade && r.endereco_estado ? `${r.endereco_cidade}/${r.endereco_estado}` : (r.endereco_cidade ?? r.endereco_estado ?? "");
  if (cid) partes.push(cid);
  if (r.endereco_cep) partes.push(`CEP ${r.endereco_cep}`);
  return partes.filter(Boolean).join(", ");
};

/**
 * Gera a minuta padrão "Contrato de Fomento Mercantil — S3 Capital",
 * preenchida com os dados do cedente, representantes legais e fiadores.
 */
export function generateMinutaPDF(data: MinutaData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin - 10) {
      doc.addPage();
      y = margin;
    }
  };

  const writeTitle = (text: string) => {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(text, pageW / 2, y, { align: "center" });
    y += 8;
  };

  const writeClause = (text: string) => {
    ensureSpace(9);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(text, maxW);
    for (const l of lines) {
      ensureSpace(6);
      doc.text(l, margin, y);
      y += 5.5;
    }
    y += 2;
  };

  const writeP = (text: string, opts?: { bold?: boolean; size?: number; gap?: number }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 10);
    const lines = doc.splitTextToSize(text, maxW);
    for (const l of lines) {
      ensureSpace(5.2);
      doc.text(l, margin, y, { align: "justify", maxWidth: maxW });
      y += 5.2;
    }
    y += opts?.gap ?? 2;
  };

  // CABEÇALHO
  writeTitle("CONTRATO DE FOMENTO MERCANTIL");
  y += 2;
  writeP(
    "Pelo presente instrumento particular, as partes abaixo identificadas, de comum acordo e na melhor forma de direito, celebram o presente CONTRATO DE FOMENTO MERCANTIL, que se regerá pelas cláusulas e condições a seguir, as quais declaram aceitar integralmente.",
  );

  // CLÁUSULA 1 - PARTES
  writeClause("CLÁUSULA 1 — DAS PARTES CONTRATANTES");

  writeP("1. CONTRATADA — FATURIZADORA", { bold: true });
  writeP(
    "S3 CAPITAL SECURITIZADORA S.A., pessoa jurídica de direito privado, inscrita no CNPJ/MF sob nº 60.353.126/0001-71, com sede na Avenida Júlio Diniz, nº 257, Sala 09, Jardim Nossa Senhora, Campinas/SP, CEP 13075-420, neste ato representada por EVERALDO FERNANDO SILVÉRIO, brasileiro, casado, empresário, portador do RG nº 8.477.589 — SSP/MG e CPF/MF nº 191.926.008-08, residente e domiciliado na Rua Dr. Mário Natividade, nº 908, bairro Taquaral, Campinas/SP, CEP 13076-112, doravante denominada simplesmente CONTRATADA.",
  );

  writeP("2. CONTRATANTE — FATURIZADA", { bold: true });
  const c = data.cedente;
  const enderecoC = enderecoCedente(c) || "[ENDEREÇO COMPLETO NÃO INFORMADO]";
  let blocoContratante =
    `${c.razao_social.toUpperCase()}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob nº ${c.cnpj}, com estabelecimento na ${enderecoC}`;
  if (data.representantes.length > 0) {
    const reps = data.representantes.map((r) => {
      const partes: string[] = [];
      partes.push(r.nome.toUpperCase());
      if (r.nacionalidade) partes.push(r.nacionalidade.toLowerCase());
      if (r.estado_civil) partes.push(r.estado_civil.toLowerCase());
      if (r.qualificacao) partes.push(r.qualificacao.toLowerCase());
      const docs: string[] = [];
      if (r.rg) docs.push(`portador do RG nº ${r.rg}${r.orgao_emissor ? ` — ${r.orgao_emissor}` : ""}`);
      if (r.cpf) docs.push(`CPF/MF nº ${r.cpf}`);
      if (docs.length) partes.push(docs.join(" e "));
      const end = enderecoRep(r);
      if (end) partes.push(`residente e domiciliado na ${end}`);
      return partes.join(", ");
    });
    blocoContratante += `, neste ato representada por ${reps.join("; e ainda por ")}`;
  } else {
    blocoContratante += ", neste ato representada por seu(s) sócio(s)/administrador(es) regularmente constituído(s) em seu contrato social";
  }
  blocoContratante += ", doravante denominada simplesmente CONTRATANTE.";
  writeP(blocoContratante);

  writeP("3. RESPONSÁVEIS SOLIDÁRIOS — FIADORES", { bold: true });
  if (data.fiadores.length > 0) {
    const lista = data.fiadores
      .map((f) => {
        const docs = f.cpf ? `, CPF nº ${f.cpf}` : "";
        const q = f.qualificacao ? `, ${f.qualificacao}` : "";
        return `${f.nome.toUpperCase()}${docs}${q}`;
      })
      .join("; ");
    writeP(
      `Figuram como RESPONSÁVEIS SOLIDÁRIOS — FIADORES, em caráter solidário, irretratável e ilimitado, por todas as obrigações assumidas pela CONTRATANTE-FATURIZADA: ${lista}.`,
    );
  } else {
    writeP(
      "Os responsáveis solidários, já qualificados no instrumento original firmado entre as partes, permanecem obrigados, em caráter solidário, irretratável e ilimitado, por todas as obrigações assumidas pela CONTRATANTE-FATURIZADA neste contrato e em seus respectivos aditivos e/ou contratos operacionais, inclusive quanto à recomposição de prejuízos, recompras de títulos, penalidades, juros, correção monetária, custas, despesas e honorários advocatícios.",
    );
  }

  // CLÁUSULA 2 - OBJETO
  writeClause("CLÁUSULA 2 — DO OBJETO DO CONTRATO");
  writeP(
    "2.1. O presente contrato tem por objeto a cessão, aquisição e transferência, pela CONTRATADA-FATURIZADORA, de direitos creditórios titularizados pela CONTRATANTE-FATURIZADA, originados de suas operações mercantis, industriais, de prestação de serviços, agronegócio, locação de bens móveis ou imóveis e demais atividades lícitas, inclusive créditos futuros emergentes de vínculos contratuais já constituídos.",
  );
  writeP("2.2. As operações de fomento mercantil aqui estabelecidas compreendem, ainda:");
  writeP("I — A antecipação de recursos financeiros à CONTRATANTE-FATURIZADA, em contrapartida à cessão dos direitos creditórios;");
  writeP("II — A análise cadastral, comercial e de risco dos sacados-devedores;");
  writeP("III — a assessoria mercantil e administrativa relativa à gestão dos recebíveis;");
  writeP("IV — A cobrança administrativa dos títulos cedidos;");
  writeP("V — A gestão, controle e monitoramento dos créditos;");
  writeP("VI — Demais serviços acessórios necessários ao pleno desenvolvimento das operações de fomento mercantil.");
  writeP(
    "2.3. A cessão dos direitos creditórios poderá ocorrer à vista, total ou parcialmente, mediante a transferência plena dos títulos via endosso translativo, cessão civil ou outro instrumento admitido em lei, com incorporação dos créditos ao patrimônio da CONTRATADA-FATURIZADORA.",
  );
  writeP(
    "2.4. As partes reconhecem que as operações objeto deste contrato não constituem operação de crédito bancário, mútuo, financiamento ou desconto bancário, não se confundindo com atividade privativa de instituição financeira, tratando-se de modalidade típica de fomento mercantil, nos termos da legislação e jurisprudência aplicáveis.",
  );

  // CLÁUSULA 3
  writeClause("CLÁUSULA 3 — DAS CONDIÇÕES GERAIS APLICÁVEIS À OPERAÇÃO");
  writeP(
    "3.1. Este contrato será regido pelas disposições do Código Civil Brasileiro (Lei nº 10.406/2002), pela Lei nº 9.613/1998 (prevenção à lavagem de dinheiro), pela Lei nº 13.709/2018 (LGPD), pelas normas expedidas pelos órgãos competentes, bem como pelas demais normas aplicáveis às operações de fomento mercantil.",
  );
  writeP(
    "3.2. As partes declaram-se em plena conformidade com as normas de compliance, integridade, anticorrupção e prevenção à lavagem de dinheiro, obrigando-se a conduzir seus negócios com ética, transparência e observância da legislação vigente, respondendo pelas consequências civis, administrativas e criminais por atos ilícitos que venham a praticar.",
  );
  writeP(
    "3.3. Antes da efetivação de cada operação, a CONTRATADA-FATURIZADORA realizará análise e seleção dos títulos apresentados, podendo recusá-los, total ou parcialmente, se verificar: (a) inconsistências documentais; (b) vícios de origem; (c) indícios de fraude; (d) elevado risco de inadimplência; (e) qualquer fato que comprometa a liquidez, exigibilidade ou legitimidade dos créditos cedidos.",
  );
  writeP(
    "3.4. A remuneração da CONTRATADA-FATURIZADORA será composta pelo fator de compra, pela comissão ad valorem, por eventuais despesas operacionais, tributos incidentes, IOF quando aplicável e demais encargos previstos nos respectivos aditivos e/ou contratos operacionais, que integrarão o presente instrumento.",
  );
  writeP(
    "3.5. As operações serão formalizadas mediante ADITIVOS e/ou CONTRATOS OPERACIONAIS, nos quais constarão, dentre outros: discriminação dos títulos; valor de face; valor líquido a ser disponibilizado; fator de compra aplicável; tributos e encargos; condições de pagamento; eventuais garantias complementares.",
  );
  writeP(
    "3.6. Os ADITIVOS e/ou CONTRATOS OPERACIONAIS terão força de título executivo extrajudicial, nos termos da legislação vigente, possuindo autonomia jurídica, sem prejuízo de sua vinculação a este contrato principal.",
  );
  writeP(
    "3.7. As partes reconhecem como válidas as assinaturas eletrônicas e digitais apostas nos instrumentos derivados deste contrato, desde que emitidas por meio de certificados digitais ou plataformas que observem a legislação pertinente e a ICP-Brasil.",
  );
  writeP(
    "3.8. Os títulos de crédito cedidos e endossados à CONTRATADA-FATURIZADORA deverão conter, sempre que aplicável, a cláusula \"sem despesas\" ou \"sem protesto\", nos termos dos artigos 45, 46 e 70 do Decreto nº 57.663/66 e do artigo 25 da Lei nº 5.474/68.",
  );

  // CLÁUSULA 4
  writeClause("CLÁUSULA 4 — DA PRECIFICAÇÃO, FATOR DE COMPRA E CUSTOS OPERACIONAIS");
  writeP(
    "4.1. O preço de aquisição dos direitos creditórios será determinado mediante aplicação de FATOR DE COMPRA, livremente pactuado entre as partes, levando em consideração, entre outros: (a) custo de captação e oportunidade dos recursos; (b) prazo de vencimento dos títulos; (c) risco de crédito dos sacados; (d) risco operacional; (e) carga tributária incidente; (f) despesas administrativas e operacionais; (g) margem de remuneração da CONTRATADA-FATURIZADORA.",
  );
  writeP(
    "4.2. O cálculo da remuneração da CONTRATADA-FATURIZADORA observará o prazo pro rata temporis entre a data da aquisição dos direitos creditórios e o vencimento dos respectivos títulos.",
  );
  writeP(
    "4.3. Os direitos creditórios representados por títulos de crédito (duplicatas, notas promissórias, cheques etc.) serão transferidos por endosso translativo em preto, operando-se a transferência plena da titularidade, com todos os direitos, ações e garantias a ele inerentes.",
  );
  writeP(
    "4.4. Sem prejuízo da transferência plena, a CONTRATANTE-FATURIZADA será responsável, nos termos deste contrato e da legislação cambial, pela solvência dos títulos cedidos, na hipótese de inadimplemento dos sacados-devedores, vícios de origem, irregularidades, inexistência da operação, defeitos na prestação de serviços ou entrega de mercadorias.",
  );
  writeP(
    "4.5. A CONTRATADA-FATURIZADORA poderá, a seu exclusivo critério, exigir garantias adicionais ou reforço de garantias já existentes sempre que, no curso da relação contratual, verificar o aumento do risco das operações.",
  );

  // CLÁUSULA 5
  writeClause("CLÁUSULA 5 — DA RECOMPRA DOS DIREITOS CREDITÓRIOS");
  writeP(
    "5.1. A CONTRATANTE-FATURIZADA dispensa expressamente a CONTRATADA-FATURIZADORA da obrigatoriedade de promover o protesto por falta de pagamento para o exercício do direito de regresso, de acordo com a faculdade prevista no artigo 46 do Decreto nº 57.663/66 e no artigo 25 da Lei nº 5.474/68.",
  );
  writeP(
    "5.2. Na hipótese de não pagamento, pelo sacado-devedor, do título cedido, bem como em caso de vício, irregularidade, inexistência de causa, fraude, contestação, devolução de mercadoria, arrependimento, cancelamento ou qualquer outra exceção que comprometa o crédito, a CONTRATANTE-FATURIZADA obriga-se a realizar a recompra do respectivo direito creditório no prazo máximo de 24 (vinte e quatro) horas, contado da comunicação da CONTRATADA-FATURIZADORA.",
  );
  writeP(
    "5.3. A recompra será efetuada pelo valor de face do título, acrescido de: (a) multa contratual de 2% (dois por cento); (b) juros de mora de 10% (dez por cento) ao mês, com fundamento na faculdade prevista no artigo 406 do Código Civil; (c) correção monetária segundo índices oficiais regularmente estabelecidos; (d) honorários advocatícios fixados em 10% (dez por cento) sobre o valor atualizado; (e) demais despesas operacionais, cartorárias, bancárias e judiciais suportadas pela CONTRATADA-FATURIZADORA.",
  );
  writeP(
    "5.4. O não cumprimento da obrigação de recompra no prazo estipulado poderá ensejar, a critério da CONTRATADA-FATURIZADORA, o ajuizamento imediato de ação de execução contra a CONTRATANTE-FATURIZADA e os RESPONSÁVEIS SOLIDÁRIOS-FIADORES, com base neste contrato e nos respectivos aditivos.",
  );
  writeP(
    "5.5. Efetuada a recompra, a CONTRATANTE-FATURIZADA ficará sub-rogada nos direitos anteriormente titularizados pela CONTRATADA-FATURIZADORA, cabendo-lhe, a partir de então, o exercício das medidas de cobrança em face do sacado-devedor.",
  );
  writeP(
    "5.6. A eventual tolerância da CONTRATADA-FATURIZADORA quanto a prazos, formas ou condições de recompra não importará em novação, renúncia ou alteração deste contrato, sendo considerada mera liberalidade, que não impedirá o exercício posterior dos direitos aqui previstos.",
  );

  // CLÁUSULA 6
  writeClause("CLÁUSULA 6 — DAS OBRIGAÇÕES DA CONTRATANTE-FATURIZADA");
  writeP("6.1. Apresentar à CONTRATADA-FATURIZADORA, a cada operação, toda a documentação que comprove de forma plena, inequívoca e idônea a legitimidade, existência, origem, liquidez e certeza dos créditos cedidos (notas fiscais, comprovantes de entrega, ordens de compra, pedidos, contratos de fornecimento, recibos, comprovantes de prestação de serviços, declarações do sacado e qualquer outro elemento solicitado).");
  writeP("6.2. Declara, sob pena de responsabilidade civil e criminal, que todos os títulos cedidos são verdadeiros, autênticos e correspondentes a operações comerciais efetivamente realizadas, sem vício, contestação, pendência ou condição que possa comprometer a exigibilidade dos créditos.");
  writeP("6.3. É vedado modificar, renegociar, prorrogar, antecipar, extinguir, substituir, cancelar ou alterar as condições originais pactuadas com os sacados-devedores após a cessão, salvo autorização prévia e expressa da CONTRATADA-FATURIZADORA, sob pena de recompra imediata.");
  writeP("6.4. Notificar formalmente, no prazo de 48 horas, os sacados-devedores acerca da cessão (art. 290 CC), informando que o pagamento deve ser feito exclusivamente à CONTRATADA-FATURIZADORA, entregando-lhe o comprovante.");
  writeP("6.5. A ausência de notificação torna a cessão pro solvendo, respondendo a CONTRATANTE-FATURIZADA pela solvência integral dos títulos.");
  writeP("6.6. Comunicar à CONTRATADA-FATURIZADORA, em até 24 horas, qualquer fato relevante (reclamações, devoluções, cancelamentos, contestações, divergências, protestos, sustações, contraordens, atrasos, recusa de aceite ou qualquer irregularidade).");
  writeP("6.7. Comunicar, em até 24 horas, qualquer alteração societária, de endereço, ramo de atividade, capital social ou situação econômico-financeira que possa impactar este contrato.");
  writeP("6.8. Reembolsar integralmente a CONTRATADA-FATURIZADORA por todas as despesas decorrentes de irregularidades dos títulos cedidos (protestos, custas, honorários, diligências, certidões etc.).");
  writeP("6.9. Em caso de recebimento indevido de pagamento referente a crédito já cedido, repassá-lo integralmente em até 24 horas, sob pena de apropriação indébita.");
  writeP("6.10. Declara que cópias e documentos digitais entregues são fiéis aos originais, obrigando-se a apresentá-los em até 48 horas quando solicitados.");
  writeP("6.11. Caso ocorra liberação de recursos antes da entrega dos originais, assume a condição de fiel depositária, devendo entregar os originais em até 48 horas.");
  writeP("6.12. É vedado renegociar valores, conceder descontos, aceitar devoluções, cancelar notas, emitir notas substitutas ou alterar prazos sem anuência expressa da CONTRATADA-FATURIZADORA.");
  writeP("6.13. Responde integralmente por vícios, defeitos, ilegalidades, falsidades, fraudes, duplicidades ou inconsistências dos créditos cedidos, com obrigação de recompra imediata.");

  // CLÁUSULA 7
  writeClause("CLÁUSULA 7 — DAS OBRIGAÇÕES DA CONTRATADA-FATURIZADORA");
  writeP("7.1. Realizar o pagamento dos valores correspondentes à aquisição dos direitos creditórios nos termos, condições e prazos estabelecidos em cada ADITIVO ou CONTRATO OPERACIONAL.");
  writeP("7.2. Zelar pela guarda, integridade e conservação dos documentos físicos ou digitais entregues, devolvendo-os após quitação, recompra ou desligamento da operação.");
  writeP("7.3. Adotar todas as providências necessárias à regular cobrança dos títulos cedidos, podendo promover notificações, contatos operacionais, envio a protesto, ações judiciais e demais atos.");
  writeP("7.4. Poderá notificar diretamente os sacados-devedores sobre a cessão dos créditos, sem que isso exclua a obrigação primária da CONTRATANTE-FATURIZADA.");
  writeP("7.5. Atuar em conformidade com as normas legais e cambiais aplicáveis.");
  writeP("7.6. Manter sigilo sobre as informações comerciais, financeiras e cadastrais da CONTRATANTE-FATURIZADA e seus sacados-devedores, ressalvadas as hipóteses legais.");
  writeP("7.7. Não assume a obrigação de garantir a solvência dos sacados-devedores; permanece a CONTRATANTE-FATURIZADA responsável pela recompra dos títulos inadimplidos, contestados, viciados ou irregulares.");

  // CLÁUSULA 8
  writeClause("CLÁUSULA 8 — DAS RESPONSABILIDADES ESPECIAIS DA CONTRATANTE-FATURIZADA");
  writeP("8.1. Declara-se totalmente responsável pela legalidade, veracidade e legitimidade das duplicatas emitidas, ciente de que a emissão fraudulenta constitui crime previsto no art. 172 do Código Penal.");
  writeP("8.2. Responde pela regularidade de cheques cedidos, vícios de origem, sustações fraudulentas, conluios com sacados e práticas que possam caracterizar fraude.");
  writeP("8.3. Declara que cópias reprográficas ou documentos digitalizados são fiéis aos originais, comprometendo-se a apresentá-los em até 48 horas quando solicitados.");
  writeP("8.4. A recusa injustificada na apresentação ou retenção indevida dos originais autoriza a CONTRATADA-FATURIZADORA a considerar descaracterizada a regularidade do crédito.");

  // CLÁUSULAS 9-14: blocos resumidos (texto integral em aditivos)
  writeClause("CLÁUSULAS 9 A 14 — DEMAIS DISPOSIÇÕES");
  writeP("9. Garantias adicionais — A CONTRATANTE-FATURIZADA poderá outorgar garantias reais, fidejussórias ou pessoais sempre que solicitado, sem prejuízo da fiança solidária dos RESPONSÁVEIS SOLIDÁRIOS-FIADORES.");
  writeP("10. Compliance, prevenção à lavagem de dinheiro e anticorrupção — As partes obrigam-se a observar integralmente a legislação aplicável, mantendo política de integridade e respondendo individualmente por desvios.");
  writeP("11. Confidencialidade — As informações trocadas entre as partes têm caráter sigiloso e somente poderão ser divulgadas mediante autorização expressa, ordem judicial ou exigência regulatória.");
  writeP("12. Assinatura eletrônica e validade jurídica — As partes reconhecem a validade das assinaturas eletrônicas e digitais apostas neste instrumento e em seus aditivos, nos termos da MP 2.200-2/2001 e demais normas aplicáveis.");
  writeP("13. Comunicações — Considerar-se-ão válidas as comunicações enviadas aos endereços, e-mails e telefones constantes neste contrato, cabendo a cada parte manter seus dados atualizados.");
  writeP("14. Disposições gerais — A nulidade ou ineficácia de qualquer cláusula não afetará as demais. Nenhuma tolerância importará em novação. Os direitos e obrigações são intransferíveis sem prévia anuência da outra parte.");
  writeP("14-A. Proteção de dados (LGPD) — As partes tratarão dados pessoais conforme a Lei nº 13.709/2018, observando as bases legais aplicáveis e adotando medidas de segurança adequadas. O descumprimento sujeita a parte infratora às penalidades cabíveis.");

  // CLÁUSULA 15
  writeClause("CLÁUSULA 15 — DA RESCISÃO DO CONTRATO");
  writeP("15.1. Rescisão imotivada por qualquer das partes mediante aviso escrito com 30 dias de antecedência, desde que não haja operações em curso, títulos pendentes ou obrigações de recompra inadimplidas.");
  writeP("15.2. Rescisão imediata em caso de: (a) não apresentação de documentação; (b) alteração não autorizada das condições com sacados; (c) omissão de informações relevantes; (d) inadimplemento de recompra; (e) fraudes; (f) mudança de endereço, encerramento, recuperação judicial, falência ou insolvência; (g) descumprimento de qualquer cláusula.");
  writeP("15.3. A rescisão por culpa da CONTRATANTE-FATURIZADA acarreta multa de 10% sobre o saldo devedor, juros de 1% ao mês, correção monetária, honorários de 10% e recomposição de prejuízos.");
  writeP("15.4. A rescisão não prejudica a cobrança dos créditos já cedidos.");

  // CLÁUSULA 16
  writeClause("CLÁUSULA 16 — DO PRAZO E DA VIGÊNCIA");
  writeP("16.1. Vigência de 04 (quatro) anos a contar da assinatura, prorrogável automaticamente por iguais períodos, salvo manifestação em contrário com 30 dias de antecedência.");
  writeP("16.2. A rescisão por descumprimento contratual produz efeitos imediatos, independentemente de notificação, sem prejuízo da exigibilidade das obrigações pendentes.");

  // CLÁUSULA 17
  writeClause("CLÁUSULA 17 — DO FORO");
  writeP("17.1. As partes elegem, com exclusão de qualquer outro, o FORO DA COMARCA DE PAULÍNIA/SP como competente para dirimir quaisquer dúvidas, controvérsias ou litígios decorrentes deste contrato e de seus aditivos.");

  // ADITIVO COM CONDIÇÕES APROVADAS (se houver)
  if (data.proposta) {
    writeClause("ANEXO I — CONDIÇÕES APROVADAS PELA ÁREA DE CRÉDITO");
    if (data.proposta.codigo) writeP(`Código da proposta: ${data.proposta.codigo}`);
    writeP(`Limite aprovado: ${fmtBRL(data.proposta.valor_aprovado)}`);
    writeP(`Prazo: ${data.proposta.prazo_dias ? `${data.proposta.prazo_dias} dias` : "—"}`);
    writeP(`Taxa de desconto: ${data.proposta.taxa_sugerida != null ? `${data.proposta.taxa_sugerida}% ao mês` : "a definir caso a caso"}`);
    if (data.proposta.finalidade) writeP(`Finalidade: ${data.proposta.finalidade}`);
    if (data.proposta.garantias) writeP(`Garantias: ${data.proposta.garantias}`);
    if (data.proposta.decided_at) writeP(`Aprovado em: ${new Date(data.proposta.decided_at).toLocaleDateString("pt-BR")}`);
  }

  // FECHAMENTO
  ensureSpace(20);
  y += 4;
  writeP(
    "E, por estarem assim justas e contratadas, firmam o presente instrumento em 2 (duas) vias de igual teor e forma, juntamente com as testemunhas abaixo, para que produza seus efeitos legais.",
  );
  writeP(`Campinas/SP, ${todayLong()}.`, { gap: 8 });

  // ASSINATURAS
  const sigBlock = (label1: string, label2: string) => {
    ensureSpace(28);
    doc.setDrawColor(0);
    doc.line(margin + 30, y + 10, pageW - margin - 30, y + 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label1, pageW / 2, y + 16, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(label2, pageW / 2, y + 21, { align: "center" });
    y += 28;
  };

  sigBlock("S3 CAPITAL SECURITIZADORA S.A.", "CONTRATADA");
  sigBlock(c.razao_social.toUpperCase(), `CNPJ ${c.cnpj} — CONTRATANTE`);

  if (data.fiadores.length > 0) {
    for (const f of data.fiadores) {
      sigBlock(f.nome.toUpperCase(), `${f.cpf ? `CPF ${f.cpf} — ` : ""}RESPONSÁVEL SOLIDÁRIO / FIADOR`);
    }
  } else {
    sigBlock("RESPONSÁVEL SOLIDÁRIO / FIADOR", "(cônjuge, se aplicável)");
  }

  // TESTEMUNHAS
  ensureSpace(35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TESTEMUNHAS:", margin, y);
  y += 8;
  const colW = (maxW - 10) / 2;
  doc.setDrawColor(0);
  doc.line(margin, y + 8, margin + colW, y + 8);
  doc.line(margin + colW + 10, y + 8, margin + maxW, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("1. Nome:", margin, y + 13);
  doc.text("2. Nome:", margin + colW + 10, y + 13);
  doc.text("RG:", margin, y + 18);
  doc.text("RG:", margin + colW + 10, y + 18);
  doc.text("CPF:", margin, y + 23);
  doc.text("CPF:", margin + colW + 10, y + 23);

  // Rodapé com paginação
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Contrato de Fomento Mercantil — S3 Capital • Gerado em ${todayLong()} • Página ${i} de ${total}`,
      pageW / 2,
      pageH - 8,
      { align: "center" },
    );
    doc.setTextColor(0);
  }

  return doc;
}

export function downloadMinutaPDF(data: MinutaData) {
  const doc = generateMinutaPDF(data);
  const safeName = data.cedente.razao_social.replace(/[^\w\s-]+/g, "").trim().replace(/\s+/g, "_");
  doc.save(`contrato_fomento_${safeName}_${Date.now()}.pdf`);
}
