const fs = require('fs');
const content = fs.readFileSync('app/app/weave-ai/chat/page.tsx', 'utf8');

let newContent = content.replace('export default function ChatPage() {', 'export function ChatInterface({ chatId }: { chatId?: string }) {\n  const [isInitializing, setIsInitializing] = useState(true);');

newContent = newContent.replace(/  const \[isDrawerOpen.*?;\n/, '');

const initEffect = `
  useEffect(() => {
    if (chatId) {
      if (currentSession?.id !== chatId) {
        loadSession?.(chatId);
      }
      setIsInitializing(false);
    } else {
      createNewSession?.();
      setIsInitializing(false);
    }
  }, [chatId]);
`;

newContent = newContent.replace('const { user } = useAuth();', `const { user } = useAuth();\n${initEffect}`);

newContent = newContent.replace(/\{\/\* Backdrop \*\/\}[\s\S]*?\{\/\* Painel Lateral.*?\}[\s\S]*?\{\/\* ============================ HEADER ============================ \*\//g, '{/* ============================ HEADER ============================ */');

newContent = newContent.replace(/<button[\s\S]*?onClick=\{\(\) => setIsDrawerOpen\(true\)\}[\s\S]*?<\/button>\s*<div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800" \/>/, '');

if(!fs.existsSync('app/app/weave-ai/chat/_components')) fs.mkdirSync('app/app/weave-ai/chat/_components');
fs.writeFileSync('app/app/weave-ai/chat/_components/chat-interface.tsx', newContent);
console.log('done script!');
