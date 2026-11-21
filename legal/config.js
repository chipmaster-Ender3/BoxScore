/* BoxScore — dados legais e de contato (Beta 7.9.2).
 * ÚNICO lugar para editar: as páginas de Privacidade, Termos e Excluir conta e o formulário "Fale conosco" do app leem daqui.
 * Preencha os campos marcados com [ ] antes de publicar nas lojas.
 */
window.BX_LEGAL = {
  app: 'BoxScore',                              // nome do app (provisório)
  controller: '[NOME COMPLETO OU RAZÃO SOCIAL]', // quem responde pelos dados (pessoa física ou empresa)
  docId: '[CPF OU CNPJ]',                       // opcional para pessoa física; obrigatório para empresa
  city: '[CIDADE/UF]',                          // cidade/estado do responsável (foro)
  email: '',                                    // e-mail oficial; vazio = só o formulário do app (mensagens ficam no Firestore, coleção "contact")
  updated: '18 de novembro de 2026',            // data por extenso (usada se updatedISO estiver vazio)
  updatedISO: '2026-11-18',                     // data da versão (AAAA-MM-DD); cada idioma mostra no seu formato
  version: '1.0',
  minAgeNetwork: 18,                            // idade mínima para a Comunidade (recursos sociais)
  deleteDays: 15                                // prazo para concluir pedidos de exclusão
};
