
ALTER TABLE investor_contacts DROP CONSTRAINT IF EXISTS investor_contacts_stage_check;

UPDATE investor_contacts SET stage = 'lead' WHERE stage = 'prospeccao';
UPDATE investor_contacts SET stage = 'primeiro_contato' WHERE stage = 'apresentacao';
UPDATE investor_contacts SET stage = 'em_negociacao' WHERE stage IN ('due_diligence', 'proposta');
UPDATE investor_contacts SET stage = 'boleta_em_andamento' WHERE stage = 'fechamento';
UPDATE investor_contacts SET stage = 'investidor_ativo' WHERE stage = 'ativo';

ALTER TABLE investor_contacts ADD CONSTRAINT investor_contacts_stage_check
CHECK (stage = ANY (ARRAY['lead'::text, 'primeiro_contato'::text, 'em_negociacao'::text, 'boleta_em_andamento'::text, 'investidor_ativo'::text, 'manter_relacionamento'::text, 'perdido'::text]));
