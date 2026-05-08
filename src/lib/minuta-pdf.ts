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

const PH = "_______________"; // placeholder padrão para campos vazios

const orPH = (v?: string | null) => (v && v.trim() ? v.trim() : PH);

// Constrói a qualificação completa do CONTRATANTE (cedente)
function blocoContratante(c: MinutaCedente): string {
  const logr = orPH(c.logradouro ?? c.endereco);
  const num = orPH(c.numero);
  const bairro = orPH(c.bairro);
  const cidade = orPH(c.cidade);
  const estado = orPH(c.estado);
  const cep = orPH(c.cep);
  return (
    `${(c.razao_social || PH).toUpperCase()}, pessoa jurídica de direito privado, devidamente inscrita no CNPJ/MF sob o n. ${orPH(c.cnpj)}, ` +
    `com endereço à ${logr}, n. ${num}, bairro ${bairro}, na cidade de ${cidade}, estado de ${estado}, CEP: ${cep}, ` +
    `neste ato representada conforme determinação de seus Atos Constitutivos, de ora em diante denominada simplesmente como CONTRATANTE ou FOMENTADA,`
  );
}

function blocoAvalista(f: MinutaFiador): string {
  // Sem dados completos do avalista no schema; mantemos qualificação compacta
  const cpf = f.cpf ? `inscrito(a) no CPF/MF sob o n. ${f.cpf}` : `inscrito(a) no CPF/CNPJ sob o n. ${PH}`;
  const q = f.qualificacao ? ` (${f.qualificacao})` : "";
  return (
    `${(f.nome || PH).toUpperCase()}${q}, ${cpf}, com endereço à ${PH}, n. ${PH}, bairro ${PH}, ` +
    `na cidade de ${PH}, estado de ${PH}, CEP: ${PH}, de ora em diante denominado(a) simplesmente como AVALISTA,`
  );
}

/**
 * Gera a minuta padrão "INSTRUMENTO PARTICULAR DE FOMENTO MERCANTIL", seguindo
 * o texto-padrão fornecido pelo jurídico (avalista + garantia), preenchida com
 * os dados do cedente, representantes legais e fiadores.
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
    ensureSpace(10);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(text, maxW);
    for (const l of lines) {
      ensureSpace(6);
      doc.text(l, margin, y);
      y += 5.5;
    }
    y += 1.5;
  };

  const writeP = (text: string, opts?: { bold?: boolean; size?: number; gap?: number; align?: "left" | "justify" | "center" }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 10);
    const lines = doc.splitTextToSize(text, maxW);
    for (const l of lines) {
      ensureSpace(5.2);
      if (opts?.align === "center") {
        doc.text(l, pageW / 2, y, { align: "center" });
      } else {
        doc.text(l, margin, y, { align: opts?.align ?? "justify", maxWidth: maxW });
      }
      y += 5.2;
    }
    y += opts?.gap ?? 2;
  };

  // ============ CABEÇALHO ============
  writeTitle("INSTRUMENTO PARTICULAR DE FOMENTO MERCANTIL");
  y += 2;

  writeP(
    "Pelo presente instrumento particular de fomento mercantil, na melhor forma de direito e nos termos da legislação civil aplicável, especialmente os artigos 286 e seguintes do Código Civil, de um lado, como CONTRATADA:",
  );

  writeP(
    "S3 CAPITAL SECURITIZADORA S/A, pessoa jurídica de direito privado, devidamente inscrita no CNPJ/MF sob o n. 60.353.126/0001-71, com endereço à Av. Júlio Diniz, n. 257, sala 09, Jd. Nossa Senhora Auxiliadora, na cidade de Campinas, estado de São Paulo, CEP: 13075-420, neste ato representada conforme determinação de seus Atos Constitutivos, de ora em diante denominada simplesmente como CONTRATADA ou FOMENTADORA e, de outro lado,",
  );

  writeP(blocoContratante(data.cedente));

  if (data.fiadores.length > 0) {
    for (const f of data.fiadores) {
      writeP(blocoAvalista(f));
    }
  } else {
    writeP(
      `${PH}, na condição de AVALISTA, qualificação completa a ser preenchida no momento da assinatura, de ora em diante denominado(a) simplesmente como AVALISTA,`,
    );
  }

  writeP("e em conjunto, Partes,");
  writeP(
    "Têm, como justo e acordado o quanto segue no que diz respeito ao fomento mercantil, a ser realizado nas condições abaixo e, ainda, eventuais Contratos de Cessão que passarão a compor o presente na condição de Aditivos.",
  );

  // ============ CONSIDERANDOS ============
  writeClause("Considerando:");
  writeP("a) Que a FOMENTADA possui relações comerciais com diversas pessoas, físicas e jurídicas, para o fornecimento de produtos de sua especialidade;");
  writeP("b) Que a FOMENTADA não tem meios em caixa de promover a fabricação, elaboração e entrega imediata desses produtos nos termos de Pedidos de Compra já emitidos e ora apresentados;");
  writeP("c) Que a FOMENTADORA poderá fomentar a atividade exercida pela FOMENTADA, mediante o adiantamento de valores a serem destinados, obrigatoriamente aos pedidos descritos, ou, ainda, comprovados através de meio idôneo a ser enviado à FOMENTADORA;");
  writeP("d) Que, para que tal operação se concretize, a FOMENTADORA irá realizar o adiantamento financeiro tanto para a FOMENTADA como para quem ela indicar, de modo a proporcionar o exercício empresarial e entrega efetiva aos clientes da FOMENTADA, sem que a FOMENTADORA passe a ser considerada sócia ou, até mesmo parceira comercial da Contratante.");
  writeP("e) Que o pagamento à FOMENTADA, a ser realizado pela FOMENTADORA, será realizado após a efetivação da comprovação dos pedidos e terminará com a emissão das Notas Fiscais respectivas, seja pela FOMENTADA, seja pelas empresas clientes da FOMENTADA, conforme melhor delineado nos Termos de Cessão respectivos.");
  writeP("As partes resolvem por regulamentar a relação conforme as cláusulas que seguem:");

  // ============ CLÁUSULA PRIMEIRA ============
  writeClause("CLÁUSULA PRIMEIRA – DO OBJETO");
  writeP("1.1. O presente contrato tem por objeto a realização de operação de fomento mercantil produtivo, mediante a aquisição, pela FOMENTADORA, de direitos creditórios presentes e futuros de titularidade da FOMENTADA, oriundos de suas relações comerciais com terceiros (SACADOS/CLIENTES), com a finalidade de viabilizar a produção e circulação de bens pela FOMENTADA.");

  // ============ CLÁUSULA SEGUNDA ============
  writeClause("CLÁUSULA SEGUNDA – DA CESSÃO DE CRÉDITOS");
  writeP("2.1. A FOMENTADA cede e transfere à FOMENTADORA, em caráter oneroso, irrevogável e irretratável, os direitos creditórios presentes e futuros decorrentes de pedidos comerciais, contratos e notas fiscais, a serem comprovados mediante a entrega de documentação hábil para tanto.");
  writeP("2.2. A cessão abrange créditos ainda não constituídos, condicionados à efetiva produção, entrega e emissão das respectivas notas fiscais.");
  writeP("2.3. A titularidade dos créditos será automaticamente transferida à FOMENTADORA no momento de sua constituição, sendo certo que, neste momento, haverá a formalização do respectivo termo e, ainda, enviado comunicado ao SACADO para que este passe a ter ciência acerca da necessidade de pagamento à FOMENTADORA.");
  writeP("2.4. A cessão dos créditos mediante a formalização do respectivo termo será formalizada por escrito e passará a compor o presente na condição de Termo Aditivo, de modo que aplicar-se-á o regramento aqui delimitado, ressalvada disposição em sentido contrário que eventualmente venha a existir.");

  // ============ CLÁUSULA TERCEIRA ============
  writeClause("CLÁUSULA TERCEIRA – DA ANTECIPAÇÃO DE RECURSOS");
  writeP("3.1. A FOMENTADORA poderá antecipar valores à FOMENTADA com base na expectativa de constituição dos créditos, a ser analisada mediante comprovação idônea por parte da FOMENTADA.");
  writeP("3.2. Os valores antecipados serão definidos conforme análise de risco, volume de pedidos e capacidade produtiva da FOMENTADA, e poderão ser pagos diretamente à FOMENTADA ou a quem esta vier a indicar, exemplificadamente, não de maneira exaustiva, fornecedores de materiais e prestadores de serviço envolvidos no método produtivo empregado.");
  writeP("3.3. Os pagamentos realizados a terceiros por indicação da FOMENTADA serão considerados como efetivamente pagos à FOMENTADA, que permanecerá integralmente responsável pela correta aplicação dos recursos, não podendo alegar desvio, inadimplemento de terceiros ou falhas na cadeia produtiva.");
  writeP("3.4. Sendo o caso de antecipação de recursos, a FOMENTADA se compromete a utilizar os valores adiantados a título de fomento apenas e tão somente para proporcionar a operacionalização do pedido de compra/prestação de serviços utilizado para a obtenção do fomento, responsabilizando-se civil e criminalmente, inclusive no que diz respeito à considerar o presente rescindido, caso realize desvios de recursos.");
  writeP("3.5. A antecipação tratada no presente instrumento não caracteriza empréstimo ou financiamento, tampouco associação entre as Partes.");

  // ============ CLÁUSULA QUARTA ============
  writeClause("CLÁUSULA QUARTA – DA PRECIFICAÇÃO");
  writeP("4.1. Pela aquisição dos créditos, a FOMENTADORA aplicará deságio sobre os valores nominais dos pedidos, de modo que os valores envolvidos serão obtidos através de precificação que considere, dentre outros fatores, os custos operacionais da FOMENTADORA, a carga tributária, custos de oportunidade e expectativa de lucro.");
  writeP("4.2. As Partes são livres para o estabelecimento e aceite de preço a ser aplicado, de modo que, se os créditos a serem cedidos estiverem representados por Título de Crédito, sua transferência será concretizada pelo endosso pleno, aperfeiçoado pela tradição dos títulos envolvidos e comunicação ao SACADO.");

  // ============ CLÁUSULA QUINTA ============
  writeClause("CLÁUSULA QUINTA – DA RECOMPRA DOS TÍTULOS");
  writeP("5.1. A recompra dos direitos creditórios pela FOMENTADA somente será exigida nas seguintes hipóteses:");
  writeP("I – Inexistência, nulidade ou invalidade do título cedido;");
  writeP("II – vício na origem da operação comercial, seja ele causado ou não pela FOMENTADA;");
  writeP("III – descumprimento contratual pela FOMENTADA que impeça a constituição ou exigibilidade do crédito, inclusive para os casos de culpa e/ou responsabilidade de terceiros;");
  writeP("IV – não comprovação da entrega do produto ou prestação do serviço;");
  writeP("V – pagamento do crédito ser realizado diretamente à FOMENTADA em descumprimento da cessão.");
  writeP("5.2. A inadimplência do SACADO, ainda que devidamente notificado pela FOMENTADA, igualmente implicará na obrigação automática de recompra, independentemente se for decorrente de ato, omissão ou responsabilidade da FOMENTADA.");
  writeP("5.3. Na eventualidade da não liquidação dos direitos creditórios cedidos ou qualquer outro vício, será a FOMENTADA comunicada para que efetue a recompra no prazo de até 24 (vinte e quatro) horas, sob pena de, decorrido o prazo citado, serem aplicados sobre o crédito inadimplido pelo sacado devedor os mesmos encargos moratórios previstos nesta Cláusula.");
  writeP("5.4. O não cumprimento da obrigação de recompra no prazo estipulado, além dos encargos moratórios, poderá dar ensejo à execução judicial contra a FOMENTADA e eventuais devedores solidários.");
  writeP("5.5. A FOMENTADA, ao recomprar os direitos creditórios, ficará sub-rogada nos direitos do credor de modo que os direitos creditórios cujos protestos por falta de pagamento tenham sido concretizados lhes serão entregues com o respectivo instrumento e carta de anuência, ficando atribuída ao credor sub-rogado a obrigação de entregar tais documentos ao devedor quando da efetiva quitação.");
  writeP("5.6. Concluída a operação e sobrevindo a constatação de vícios ou de quaisquer outras exceções na origem dos direitos creditórios negociados, a FOMENTADA será obrigada a recomprar os títulos, acrescido da multa de 2,00% (dois por cento), e de juros moratórios convencionados conforme a legislação vigente, no importe de 1% (um por cento) ao mês, bem como atualização monetária nos termos do índice adotado pelo Tribunal de Justiça do Estado de São Paulo, pro rata die.");
  writeP("5.7. A recusa na recompra dos direitos creditórios no prazo estipulado, poderá dar ensejo à execução judicial contra a FOMENTADA e eventuais DEVEDORES SOLIDÁRIOS, inclusive, mas, não se limitando à execução da garantia creditória prevista.");

  // ============ CLÁUSULA SEXTA ============
  writeClause("CLÁUSULA SEXTA – DAS OBRIGAÇÕES DA FOMENTADA");
  writeP("6.1. Ressalvada a possibilidade de novas obrigações serem estipuladas em momento posterior, através da formalização de Termo Aditivo, são obrigações da Fomentada, além de outras estabelecidas no presente instrumento:");
  writeP("a) Produzir e entregar os bens e/ou serviços conforme pactuado com os SACADOS, nos exatos termos dos Pedidos, Ordens de Serviço ou quaisquer outros meios idôneos eventualmente adotados.");
  writeP("b) Emitir as notas fiscais correspondentes aos Pedidos e Ordens de Serviço conforme a legislação vigente, com exatidão de informações, observando todas as obrigações acessórias a elas inerentes, incluindo a comprovação de entrega de produtos ou prestação de serviços.");
  writeP("c) Notificar os SACADOS acerca da cessão de crédito realizada, e enviar o comprovante da entrega da notificação à FOMENTADORA, no prazo de até 24h a partir da data de operação aqui descrita, responsabilizando-se pelo adimplemento por parte do SACADO em caso de não comprovação da efetiva entrega, através da recompra.");
  writeP("d) Incluir, em todos os documentos fiscais e comerciais, instrução expressa para pagamento diretamente à FOMENTADORA, bem como a não realizar qualquer negociação, cessão ou oneração dos créditos cedidos.");
  writeP("e) Garantir a existência, legitimidade e exigibilidade dos créditos a serem cedidos posteriormente, sob pena de responsabilizar-se por eles, na exata medida do quanto apresentado à FOMENTADORA.");
  writeP("f) Informar à FOMENTADORA toda e qualquer alteração ou situação de relevância em sua relação com o SACADO, dentre elas, mas não se limitando à desistências, notificações extrajudiciais ou judiciais etc., dentro do prazo de 24h da intercorrência identificada.");
  writeP("g) Indenizar a FOMENTADORA por todo e qualquer prejuízo ou dano que a sua conduta ou omissão em relação à cessão de créditos vier a ocasionar, inclusive, mas, não se limitando a custos judiciais e extrajudiciais.");
  writeP("h) Repassar à FOMENTADORA eventuais valores recebidos por si relacionados aos títulos cedidos se o caso de pagamento direto, sob pena de responsabilização civil e criminal.");
  writeP("6.2. A FOMENTADA reconhece que assume integral responsabilidade pelo processo produtivo, incluindo aquisição de insumos, fabricação, logística e entrega, não podendo transferir à FOMENTADORA quaisquer riscos inerentes à execução da atividade empresarial.");
  writeP("6.3. A não conclusão da produção, entrega ou prestação de serviços, por qualquer motivo, caracterizará descumprimento contratual, ensejando a obrigação de recomposição integral dos valores antecipados, não podendo a FOMENTADA se valer de qualquer situação, a exemplo de caso fortuito ou força maior, como escusa para não realizar a recompra.");

  // ============ CLÁUSULA SÉTIMA ============
  writeClause("CLÁUSULA SÉTIMA – DAS OBRIGAÇÕES DA FOMENTADORA");
  writeP("7.1. São obrigações da FOMENTADORA, dentre outras descritas no presente instrumento:");
  writeP("a) Realizar o pagamento pela compra dos títulos, na forma convencionada, seja através de pagamento à FOMENTADA, seja através de pagamentos a quem esta vier a indicar, quando da efetivação da cessão de crédito consubstanciada pela emissão da respectiva Nota Fiscal e entrega.");
  writeP("b) Realizar a devolução das notas fiscais e comprovantes de entrega de mercadorias ou serviços, após a quitação dos títulos pelo Sacado, ou, no caso de recompra pela FOMENTADA, responsabilizando-se pela guarda e conservação destes documentos.");

  // ============ CLÁUSULA OITAVA ============
  writeClause("CLÁUSULA OITAVA – DA INEXISTÊNCIA DE VÍNCULO FINANCEIRO E NATUREZA DO PRESENTE");
  writeP("8.1. As Partes ratificam que o presente instrumento não configura operação de crédito, mútuo ou atividade privativa de instituição financeira, bem como não estabelece qualquer relação que não a de fomento, inexistindo situação de associação, sucessão ou incorporação empresarial. As Partes declaram ainda que são independentes entre si e que o presente instrumento é firmado, após livre deliberação e discussão de seus termos, por representantes legais devidamente legitimados e capazes de assumir os compromissos aqui descritos.");
  writeP("8.2. Haja vista a independência entre as partes e o caráter do quanto pactuado, cada uma delas responderá, de maneira independente, por todas as suas obrigações relacionadas ou não com o presente, incluindo, mas, não se limitando ao pagamento de taxas, tributos, salários, contribuições previdenciárias, obedecendo a legislação aplicável à atividade especifica de cada uma delas em sua integralidade. Em não havendo cumprimento de tais obrigações, cujo rol não é exaustivo, por parte da FOMENTADA, esta compromete-se a indenizar a FOMENTADORA por todo e qualquer dano, prejuízo ou custo que o inadimplemento vier a ocasionar.");

  // ============ CLÁUSULA NONA ============
  writeClause("CLÁUSULA NONA – DA VIGÊNCIA");
  writeP("9.1. O presente instrumento é firmado pelo prazo de 12 (doze) meses, podendo ser renovado por igual período, de maneira automática e sucessiva, desde que as partes não se manifestem em sentido contrário. Durante a vigência estipulada, serão formalizados termos de cessão para os títulos eventualmente cedidos, os quais contarão com as especificidades de pagamento e serão aplicáveis ao presente em tudo quanto não constar em sentido contrário.");
  writeP("9.2. Poderá ocorrer a rescisão deste termo através de simples notificação de uma parte à outra, restando preservados todos os negócios e condições já firmados enquanto o presente vigia, de modo que a rescisão deste contrato não afastará a obrigação de pagamento conforme estabelecido nos Termos de Cessão, a responsabilidade das partes e, ainda, responsabilidade por quitação de títulos eventualmente cedidos.");

  // ============ CLÁUSULA DÉCIMA — DO AVAL ============
  writeClause("CLÁUSULA DÉCIMA – DO AVAL");
  const nomesAval = data.fiadores.length > 0
    ? data.fiadores.map((f) => (f.nome || PH).toUpperCase()).join(", ")
    : PH;
  writeP(`10.1. Assinam o presente, em conjunto com a FOMENTADA, ${nomesAval}, na condição de avalista e garantidor não apenas do presente, mas, também, dos aditivos a serem futuramente formalizados. O aval aqui firmado é solidário, de modo que o Avalista desde logo renuncia ao benefício de ordem ou qualquer outro que lhe venha a ser atribuído, devendo responder de maneira integral e incondicionada, nos mesmos moldes da FOMENTADA, até a integral quitação de obrigações aqui previstas.`);

  // ============ CLÁUSULA DÉCIMA PRIMEIRA ============
  writeClause("CLÁUSULA DÉCIMA PRIMEIRA – DO TÍTULO EXECUTIVO");
  writeP("11.1. O presente instrumento, assinado pelas Partes e testemunhas, resta caracterizado como título executivo extrajudicial e, em caso de inadimplemento, poderá ser livremente executado pela parte prejudicada.");
  writeP("11.2. As partes declaram-se de acordo com a assinatura do presente instrumento através de plataforma digital, não podendo vir a alegar qualquer nulidade ou falsidade de assinaturas em razão disso, bem como concordando com a execução dos exatos termos aqui descritos em caso de inadimplemento de qualquer das disposições.");

  // ============ CLÁUSULA DÉCIMA SEGUNDA ============
  writeClause("CLÁUSULA DÉCIMA SEGUNDA – DAS DISPOSIÇÕES GERAIS");
  writeP("12.1. Qualquer tolerância em relação ao disposto nesta cláusula será considerada mera liberalidade do FOMENTADORA.");
  writeP("12.2. A presente contratação está submetida à legislação Brasileira, em especial ao Código Civil e legislação cambiária específica conforme os títulos cedidos posteriormente e cuja formalização dependerá da assinatura de Termo Aditivo.");
  writeP("12.3. A FOMENTADA declara que todos os direitos creditórios cedidos ou a serem cedidos possuem lastro em operações comerciais reais, previamente formalizadas mediante pedidos de compra, contratos ou instrumentos equivalentes, contendo identificação do SACADO, objeto, valor e prazo para cumprimento e pagamento.");
  writeP("12.4. A FOMENTADORA poderá, a qualquer tempo, exigir documentação comprobatória adicional, incluindo, mas não se limitando a: contratos, pedidos formais, comprovantes de entrega, aceite do SACADO e histórico comercial.");
  writeP("12.5. A ausência, insuficiência ou inconsistência do lastro autorizará a FOMENTADORA a suspender novas operações e exigir a recompra imediata dos créditos.");
  writeP("12.6. As Partes reconhecem que a presente operação não constitui, sob qualquer hipótese, mútuo ou financiamento, inexistindo obrigação de devolução de valores em caráter geral, mas apenas nas hipóteses expressamente previstas neste instrumento, vinculadas à invalidade ou frustração do crédito.");

  // ============ CLÁUSULA DÉCIMA TERCEIRA ============
  writeClause("CLÁUSULA DÉCIMA TERCEIRA – DA GARANTIA");
  const garantiaDescricao = data.proposta?.garantias && data.proposta.garantias.trim()
    ? data.proposta.garantias.trim()
    : "(descrever por completo conforme matrícula/NF/documento de propriedade)";
  writeP(`13.1. Como meio de garantir a operação de crédito vinculada ao presente contrato, bem como estabelecer um limite ao valor das transações, a FOMENTADA dá, como garantia, o seguinte bem: ${garantiaDescricao}, o qual é de sua propriedade exclusiva e se encontra livre e desembaraçado, sem qualquer impedimento no que diz respeito ao uso como garantia nos termos aqui descritos e sob o qual compromete-se a comunicar imediatamente à FOMENTADORA em caso de perda, danificação ou comprometimento estrutural, sob pena de responsabilização civil e criminal se não vier a substituir o bem em prazo não superior a 07 (sete) dias.`);
  writeP("13.2. A FOMENTADA reconhece, assume e concorda que toda e qualquer transação que se der sob a égide do presente contrato contará com a mencionada garantia, ressalvada renúncia ou alteração expressa. A vista disso, a FOMENTADA não poderá dar o mesmo bem em garantia para qualquer outra operação ou situação sem a autorização expressa da FOMENTADORA.");

  // ============ CLÁUSULA DÉCIMA QUARTA ============
  writeClause("CLÁUSULA DÉCIMA QUARTA – DO FORO COMPETENTE");
  writeP("14.1. Fica eleito o foro da Comarca de Campinas, estado de São Paulo, para dirimir quaisquer dúvidas ou litígios decorrentes da interpretação ou cumprimento deste contrato, ou casos omissos do presente contrato, excluindo-se qualquer outro, por mais privilegiado que seja.");

  // ============ CONDIÇÕES APROVADAS (opcional) ============
  if (data.proposta && (data.proposta.valor_aprovado || data.proposta.prazo_dias || data.proposta.taxa_sugerida)) {
    writeClause("CONDIÇÕES APROVADAS PELA ÁREA DE CRÉDITO");
    if (data.proposta.codigo) writeP(`Código da proposta: ${data.proposta.codigo}`);
    writeP(`Limite aprovado: ${fmtBRL(data.proposta.valor_aprovado)}`);
    writeP(`Prazo: ${data.proposta.prazo_dias ? `${data.proposta.prazo_dias} dias` : "—"}`);
    writeP(`Taxa de desconto: ${data.proposta.taxa_sugerida != null ? `${data.proposta.taxa_sugerida}% ao mês` : "a definir caso a caso"}`);
    if (data.proposta.finalidade) writeP(`Finalidade: ${data.proposta.finalidade}`);
    if (data.proposta.decided_at) writeP(`Aprovado em: ${new Date(data.proposta.decided_at).toLocaleDateString("pt-BR")}`);
  }

  // ============ FECHAMENTO ============
  ensureSpace(20);
  y += 4;
  writeP("E assim, por estarem justas e contratadas, assinam as Partes o presente através de certificado digital.");
  writeP(`Campinas/SP, ${todayLong()}.`, { gap: 8 });

  // ============ ASSINATURAS ============
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

  sigBlock("S3 CAPITAL SECURITIZADORA S/A", "FOMENTADORA");
  sigBlock(data.cedente.razao_social.toUpperCase(), `CNPJ ${data.cedente.cnpj} — FOMENTADA`);

  if (data.fiadores.length > 0) {
    for (const f of data.fiadores) {
      sigBlock(f.nome.toUpperCase(), `${f.cpf ? `CPF ${f.cpf} — ` : ""}AVALISTA`);
    }
  } else {
    sigBlock(PH, "AVALISTA");
  }

  // ============ TESTEMUNHAS ============
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
  y += 30;

  // ============ ANEXO I — TERMO DE AUTORIZAÇÃO DE PAGAMENTO A TERCEIRO ============
  doc.addPage();
  y = margin;
  writeTitle("ANEXO I");
  writeTitle("TERMO DE AUTORIZAÇÃO DE PAGAMENTO A TERCEIRO");
  y += 2;
  writeP(`Através do presente, visando a concretização da atividade de fomento correspondente ao contrato vinculado ao presente Anexo, autorizo a FOMENTADORA a realizar o pagamento de parte do preço ajustado pela cessão de créditos, qual seja, a de R$ ${PH} (${PH}) à pessoa jurídica ${PH}, sendo ela fornecedora de matéria prima/insumos/descrever possibilidade de atuação, até o dia ${PH}, em conta de número ${PH} (descrever dados bancários).`);
  writeP("Tal pagamento deverá ser considerado, para todos os fins, como se feito em meu nome, e a comprovação através de recibo bancário bastará para que o valor seja tido como quitado para todos os fins.");
  writeP("A realização deste pagamento será ato totalmente independente do contrato firmado com a pessoa jurídica indicada, de modo que a Cessionária não poderá ser responsabilizada por eventual inadimplemento da empresa terceira.");
  writeP("Local, data.", { gap: 12 });
  sigBlock(data.cedente.razao_social.toUpperCase(), "FOMENTADA");

  // ============ ANEXO II — TERMO ADITIVO PARA INCLUSÃO DE NOTAS FISCAIS ============
  doc.addPage();
  y = margin;
  writeTitle("TERMO ADITIVO PARA INCLUSÃO DE NOTAS FISCAIS");
  y += 2;
  writeP(
    "S3 CAPITAL SECURITIZADORA S/A, pessoa jurídica de direito privado, devidamente inscrita no CNPJ/MF sob o n. 60.353.126/0001-71, com endereço à Av. Júlio Diniz, n. 257, sala 09, Jd. Nossa Senhora Auxiliadora, na cidade de Campinas, estado de São Paulo, CEP: 13075-420, neste ato representada conforme determinação de seus Atos Constitutivos, de ora em diante denominada simplesmente como CONTRATADA ou FOMENTADORA e, de outro lado,",
  );
  writeP(blocoContratante(data.cedente));
  writeP(`Têm, como justo e acordado o quanto segue no que diz respeito ao termo aditivo do contrato de fomento firmado pelas partes em ${PH} de ${PH} de ${PH}, de modo que os termos do presente passarão a compor o contrato principal de maneira subsidiária e complementar.`);

  writeClause("Considerando:");
  writeP("a) Que as partes firmaram contrato de fomento mercantil na modalidade de adiantamento para aquisição de matéria prima, custeio de insumos e fomento à produção em geral, cujas cláusulas a CONTRATANTE e a CONTRATADA reiteram os termos já descritos e inalterados a partir do presente.");
  writeP("b) Que, para que ocorra a liberação antecipada de valores se faz necessário a formalização deste Termo Aditivo com o descritivo da operação específica e autorização de pagamento.");
  writeP("As partes, em comum acordo, resolvem que:");

  writeClause("CLÁUSULA PRIMEIRA – DA LIBERAÇÃO ANTECIPADA");
  writeP("1.1. A FOMENTADORA efetuará a liberação antecipada de valores em favor da FOMENTADA conforme recomendações fornecidas pela FOMENTADORA, em documento denominado “Autorização para Depósito ou Pagamento”, que passa a fazer parte integrante deste aditivo, sendo devidamente rubricado pelas partes contratantes.");
  writeP("1.2. Em cumprimento com o quanto descrito no contrato de fomento anteriormente firmado, a FOMENTADA dá como garantia ao cumprimento de suas obrigações para com a FOMENTADORA a(s) Nota(s) Promissória(s) anexa(s) a este instrumento, que segue(m) também assinada(s) pelo(s) Responsável(eis) Solidário(s) acima qualificado(s).");
  writeP(`1.3. Para que a obrigação de fomento se dê por cumprida, faz-se necessário que a FOMENTADA encaminhe à FOMENTADORA o borderô por completo, com o valor total do fomento, a forma de pagamento e a indicação das duplicatas, devidamente endossadas à FOMENTADORA para que o contrato de fomento seja considerado quitado, até a data de ${PH}, sendo ela a do vencimento das duplicatas entregues.`);

  writeClause("CLÁUSULA SEGUNDA – DAS DISPOSIÇÕES GERAIS");
  writeP("2.1. Permanecem inalteradas, bem como são ratificadas no presente momento todas as cláusulas constantes no Contrato de Fomento firmado pelas partes, inclusive a de garantia prestada.");
  writeP("2.2. As partes declaram-se de acordo com a assinatura do presente instrumento através de plataforma digital, não podendo vir a alegar qualquer nulidade ou falsidade de assinaturas em razão disso, bem como concordando com a execução dos exatos termos aqui descritos em caso de inadimplemento de qualquer das disposições.");
  writeP("2.3. Fica eleito o foro da Comarca de Campinas, estado de São Paulo, para dirimir quaisquer dúvidas ou litígios decorrentes da interpretação ou cumprimento deste contrato, ou casos omissos do presente contrato, excluindo-se qualquer outro, por mais privilegiado que seja.");
  writeP("E assim, por estarem justas e contratadas, assinam as Partes o presente através de certificado digital.", { gap: 4 });
  writeP(`Campinas/SP, ${todayLong()}.`, { gap: 8 });
  sigBlock("S3 CAPITAL SECURITIZADORA S/A", "FOMENTADORA");
  sigBlock(data.cedente.razao_social.toUpperCase(), `CNPJ ${data.cedente.cnpj} — FOMENTADA`);
  if (data.fiadores.length > 0) {
    for (const f of data.fiadores) {
      sigBlock(f.nome.toUpperCase(), `${f.cpf ? `CPF ${f.cpf} — ` : ""}AVALISTA`);
    }
  }

  // ============ RODAPÉ COM PAGINAÇÃO ============
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Instrumento Particular de Fomento Mercantil — S3 Capital • Gerado em ${todayLong()} • Página ${i} de ${total}`,
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
