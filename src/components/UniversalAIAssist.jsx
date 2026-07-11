import React, { useMemo, useState } from 'react';
import AICopilotPanel from './AICopilotPanel.jsx';

const ROUTE_LABELS = {
  apps: { title: 'Apps Hub', titleVi: 'Trung tâm ứng dụng', taskVi: 'Hỗ trợ chọn ứng dụng phù hợp và tạo prompt nhanh cho nhu cầu dạy học.', task: 'Help choose the right app and create a quick teaching prompt.' },
  games: { title: 'Games Hub', titleVi: 'Trung tâm trò chơi', taskVi: 'Tạo luật chơi, câu hỏi, power-up và cách chữa bài sau game.', task: 'Create game rules, questions, power-ups and debriefing prompts.' },
  tools: { title: 'Tools Hub', titleVi: 'Trung tâm công cụ', taskVi: 'Gợi ý công cụ, tạo nội dung đầu vào và định dạng đầu ra.', task: 'Recommend tools, generate input content and format outputs.' },
  department: { title: 'TTCM Workspace', titleVi: 'Không gian TTCM', taskVi: 'Soạn kế hoạch, thông báo, báo cáo, biên bản và phân công nhiệm vụ tổ.', task: 'Draft plans, notices, reports, minutes and department task assignments.' },
  library: { title: 'Library', titleVi: 'Thư viện', taskVi: 'Tóm tắt, phân loại, đặt tên và tái sử dụng học liệu đã lưu.', task: 'Summarize, tag, rename and reuse saved teaching content.' },
  practice: { title: 'Practice', titleVi: 'Luyện tập', taskVi: 'Tạo bài luyện, feedback lỗi sai và bài ôn cá nhân hoá.', task: 'Create practice sets, wrong-answer feedback and remedial drills.' },
  admin: { title: 'Admin', titleVi: 'Quản trị', taskVi: 'Hỗ trợ viết thông báo, mô tả quyền và quy trình vận hành hệ thống.', task: 'Draft admin notices, permission descriptions and operating workflows.' },
  settings: { title: 'Settings', titleVi: 'Thiết lập', taskVi: 'Gợi ý cấu hình AI, hiệu năng và cách dùng công cụ trong lớp.', task: 'Suggest AI, performance and classroom-use configurations.' },
};

function routeInfo(route, tool, language) {
  if (tool) {
    const title = language === 'vi' ? tool.titleVi || tool.title : tool.title;
    const desc = language === 'vi' ? tool.descVi || tool.desc : tool.desc;
    return {
      title: `${title} · AI Assist`,
      task: language === 'vi'
        ? `Hỗ trợ ứng dụng ${title}: ${desc}. Tạo nội dung đầu vào, cải thiện output, thêm đáp án, giải thích và định dạng xuất file.`
        : `Support ${title}: ${desc}. Generate input content, improve outputs, add answer keys, explanations and export-ready formatting.`,
      defaultInstruction: language === 'vi'
        ? `Tạo nội dung dùng ngay cho ${title}, level B2-C1, bám sát THPT khi phù hợp.`
        : `Create ready-to-use content for ${title}, B2-C1 level, THPT-style where relevant.`,
    };
  }
  const item = ROUTE_LABELS[route] || { title: 'Brian English Studio', titleVi: 'Brian English Studio', taskVi: 'Hỗ trợ tạo nội dung dạy học.', task: 'Support teaching content creation.' };
  return {
    title: `${language === 'vi' ? item.titleVi : item.title} · AI Assist`,
    task: language === 'vi' ? item.taskVi : item.task,
    defaultInstruction: language === 'vi'
      ? 'Tạo nội dung dùng ngay cho giáo viên tiếng Anh THPT, có cấu trúc rõ ràng và đáp án nếu cần.'
      : 'Create ready-to-use content for a high-school English teacher with clear structure and answer keys when needed.',
  };
}

export default function UniversalAIAssist({ language = 'vi', currentRoute = 'home', selectedTool = null, apiKey = '', aiModel = '', hasApiKey = false }) {
  const [open, setOpen] = useState(false);
  const info = useMemo(() => routeInfo(currentRoute, selectedTool, language), [currentRoute, selectedTool, language]);

  return (
    <div className={`universal-ai-assist ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="universal-ai-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>AI</span>
        <b>{language === 'vi' ? 'AI hỗ trợ' : 'AI Assist'}</b>
      </button>

      {open && (
        <div className="universal-ai-drawer">
          <div className="universal-ai-drawer-head">
            <strong>{language === 'vi' ? 'AI hỗ trợ cho ứng dụng hiện tại' : 'AI support for this app'}</strong>
            <button type="button" onClick={() => setOpen(false)}>×</button>
          </div>
          <AICopilotPanel
            language={language}
            apiKey={apiKey}
            aiModel={aiModel}
            hasApiKey={hasApiKey}
            title={info.title}
            description={language === 'vi' ? 'Mở được ở mọi ứng dụng. Dùng để tạo nội dung, cải thiện dữ liệu đầu vào, viết đáp án, giải thích hoặc prompt.' : 'Available in every app. Use it to generate content, improve input data, write keys, explanations or prompts.'}
            task={info.task}
            outputFormat={language === 'vi' ? 'Trả về nội dung có thể copy trực tiếp vào ứng dụng hiện tại. Nếu là bài tập, cần có đáp án và giải thích ngắn.' : 'Return content that can be copied directly into the current app. For exercises, include answer keys and short explanations.'}
            defaultInstruction={info.defaultInstruction}
            defaultCount={20}
          />
        </div>
      )}
    </div>
  );
}
