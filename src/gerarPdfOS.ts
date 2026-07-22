import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// Ajuste o caminho abaixo se necessário para apontar para o seu cliente do Supabase
import { supabase } from '@/lib/supabase/client'; 

// Função auxiliar para carregar a imagem da URL de forma assíncrona
const carregarImagem = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Evita problemas de CORS com o Supabase Storage
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
};

export async function gerarPDFOrdemServico(order: any) {
  const doc = new jsPDF();

  // --- 1. BUSCANDO O FEEDBACK DIRETAMENTE NO SUPABASE ---
  let feedbackText = 'Nenhum feedback inserido.';
  
  try {
    const { data: feedbackData, error } = await supabase
      .from('order_feedbacks')
      .select('*')
      .eq('order_id', order.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar feedback no Supabase:", error);
    }

    // ⭐ CORREÇÃO AQUI: Agora lendo a coluna correta 'message' do seu banco de dados!
    if (feedbackData && feedbackData.message) {
      feedbackText = feedbackData.message;
    }
  } catch (err) {
    console.error("Erro na requisição de feedback:", err);
  }

  // --- 2. CABEÇALHO DO PDF ---
  doc.setFontSize(18);
  doc.text('ORDEM DE SERVIÇO', 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);
  
  // Linha divisória
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 32, 196, 32);

  // --- 3. MAPEANDO OS DADOS PRINCIPAIS ---
  const dadosTabela = [
    ['Nº da OS', order.os_number || 'N/A'],
    ['Título', order.title || 'N/A'],
    ['Descrição', order.description || 'N/A'],
    ['Condomínio', order.condominiums?.nome || 'N/A'],
    ['Status Atual', order.status === 'concluido' ? 'Concluído' : 'Em andamento'],
    ['Data do Agendamento', order.data_agendamento || 'N/A'],
    ['Horário', order.horario_agendamento || 'N/A'],
    ['Feedback do Técnico', feedbackText], // <-- Exibe o texto "feito e arrumado o problema era na cerca eletrica..."
  ];

  // --- 4. RENDERIZANDO A TABELA NO PDF ---
  autoTable(doc, {
    startY: 40,
    head: [['Campo', 'Informações Gerais']],
    body: dadosTabela,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }, // Cor Indigo/Roxa
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 }, // Coluna esquerda em negrito
    }
  });

  // Captura a posição final onde a tabela terminou de ser desenhada
  let finalY = (doc as any).lastAutoTable.finalY || 150;

  // --- 5. ADICIONANDO A IMAGEM ANEXADA ---
  const urlImagem = order.updated_by; 

  // Valida se o campo existe e se realmente é um link web válido
  if (urlImagem && typeof urlImagem === 'string' && urlImagem.startsWith('http')) {
    try {
      // Adiciona uma margem de espaço antes da imagem
      finalY += 15;

      // Se a imagem não couber no espaço restante da folha, cria uma nova página
      if (finalY + 80 > 280) {
        doc.addPage();
        finalY = 20; // Reseta a altura para o topo da nova folha
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Anexo Fotográfico de Conclusão:', 14, finalY);

      // Carrega a imagem da internet
      const img = await carregarImagem(urlImagem);

      // Calcula proporções para a imagem não ficar distorcida
      const larguraMaxima = 100; // Largura no PDF (em mm)
      const alturaMaxima = 75;   // Altura no PDF (em mm)
      let larguraFinal = img.width;
      let alturaFinal = img.height;

      const proporcao = Math.min(larguraMaxima / larguraFinal, alturaMaxima / alturaFinal);
      larguraFinal = larguraFinal * proporcao;
      alturaFinal = alturaFinal * proporcao;

      // Desenha a imagem no PDF
      doc.addImage(img, 'JPEG', 14, finalY + 5, larguraFinal, alturaFinal);

    } catch (error) {
      console.error('Não foi possível carregar a foto para o PDF:', error);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Nota: Não foi possível carregar a imagem anexada ao PDF.', 14, finalY + 10);
    }
  }

  // --- 6. SALVA O DOCUMENTO ---
  doc.save(`OS_${order.os_number || order.id}.pdf`);
}