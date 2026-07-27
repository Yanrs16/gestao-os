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
  //  ABRIR NOVA ABA IMEDIATAMENTE (Evita bloqueio de popup pelo navegador devido aos await)
  const novaAba = window.open('', '_blank');
  if (novaAba) {
    novaAba.document.write(`
      <html>
        <head><title>Gerando PDF - OS ${order.os_number || ''}</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#18181b;color:#a1a1aa;">
          <h3>Carregando e gerando Ordem de Serviço...</h3>
        </body>
      </html>
    `);
  }

  try {
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
      ['Feedback do Técnico', feedbackText],
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
        finalY += 15;

        if (finalY + 80 > 280) {
          doc.addPage();
          finalY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Anexo Fotográfico de Conclusão:', 14, finalY);

        const img = await carregarImagem(urlImagem);

        const larguraMaxima = 100;
        const alturaMaxima = 75; 
        let larguraFinal = img.width;
        let alturaFinal = img.height;

        const proporcao = Math.min(larguraMaxima / larguraFinal, alturaMaxima / alturaFinal);
        larguraFinal = larguraFinal * proporcao;
        alturaFinal = alturaFinal * proporcao;

        doc.addImage(img, 'JPEG', 14, finalY + 5, larguraFinal, alturaFinal);

      } catch (error) {
        console.error('Não foi possível carregar a foto para o PDF:', error);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Nota: Não foi possível carregar a imagem anexada ao PDF.', 14, finalY + 10);
      }
    }

    // --- 6. GERA O BLOB E ABRE NA NOVA ABA PARA PRE-VISUALIZAÇÃO E IMPRESSÃO ---
    const blob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(blob);

    if (novaAba) {
      novaAba.location.href = pdfUrl;
    } else {
      // Fallback caso popups tenham sido desativados no navegador
      window.open(pdfUrl, '_blank');
    }

  } catch (err) {
    console.error('Erro ao gerar o PDF:', err);
    if (novaAba) {
      novaAba.close();
    }
    alert('Houve um erro ao gerar o PDF da Ordem de Serviço.');
  }
}