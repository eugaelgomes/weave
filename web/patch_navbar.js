const fs = require("fs");
let content = fs.readFileSync("app/(protected)/_components/layout/navbar.tsx", "utf8");

// 1. Remove SearchModal import
content = content.replace(
  'import SearchModal from "@/app/(protected)/_components/ui/navbar/search-modal";\n',
  ""
);
// Remove createPortal
content = content.replace('import { createPortal } from "react-dom";\n', "");

// 2. Extract everything from `// --- Custom Hooks` down to `// --- Principal ---`
const customHooksStart = content.indexOf("// --- Custom Hooks");
const principalStart = content.indexOf("// --- Principal ---");
if (customHooksStart !== -1 && principalStart !== -1) {
  const middle = content.substring(customHooksStart, principalStart);
  const notificationsLinkRegex = /const NotificationsLink = \(\{[\s\S]*?\}\) => \{[\s\S]*?\};\n/m;
  const match = middle.match(notificationsLinkRegex);
  const notifStr = match ? match[0] : "";
  content =
    content.substring(0, customHooksStart) + notifStr + "\n" + content.substring(principalStart);
}

// 3. Remove state and refs inside Navbar
content = content.replace(/const \[isMenuOpen, setIsMenuOpen\] = useState\(false\);\n/g, "");
content = content.replace(/const \[isSearchOpen, setIsSearchOpen\] = useState\(false\);\n/g, "");
content = content.replace(/const \[mounted, setMounted\] = useState\(false\);\n/g, "");
content = content.replace(/const desktopMenuRef = useRef<HTMLDivElement>\(null\);\n/g, "");
content = content.replace(/const mobileMenuRef = useRef<HTMLDialogElement>\(null\);\n/g, "");

// 4. Remove useEffects related to Search and Menu
content = content.replace(/useEffect\(\(\) => setMounted\(true\), \[\]\);\n/g, "");
content = content.replace(/useKeyboardShortcut\("k", \(\) => setIsSearchOpen\(true\)\);\n/g, "");
content = content.replace(
  /useClickOutside\(\[desktopMenuRef, mobileMenuRef\], \(\) => setIsMenuOpen\(false\)\);\n/g,
  ""
);
const effMenuRegex =
  /useEffect\(\(\) => \{\n\s*document\.body\.style\.overflow = isMenuOpen \? "hidden" : "";\n\s*return \(\) => \{\n\s*document\.body\.style\.overflow = "";\n\s*\};\n\s*\}, \[isMenuOpen\]\);\n/;
content = content.replace(effMenuRegex, "");

// 5. Desktop search button
const desktopSearchRegex =
  /<div className="hidden w-full max-w-md items-center gap-2 md:flex">\n\s*<button\n\s*type="button"\n\s*onClick=\{\(\) => setIsSearchOpen\(true\)\}[\s\S]*?<\/button>/m;
content = content.replace(
  desktopSearchRegex,
  '<div className="hidden w-full max-w-md items-center justify-end gap-2 md:flex">'
); // keeping the div for NotificationsLink

// 6. Mobile search button
const mobileSearchRegex =
  /<button\n\s*type="button"\n\s*onClick=\{\(\) => setIsSearchOpen\(true\)\}\n\s*className=\{cn\(navIconMobileShellClass, "md:hidden"\)\}\n\s*aria-label=\{t\.navbar\.openSearch\}\n\s*title=\{t\.navbar\.openSearch\}\n\s*>\n\s*<Search className="h-4 w-4" strokeWidth=\{1\.75\} \/>\n\s*<\/button>\n/m;
content = content.replace(mobileSearchRegex, "");

// 7. User Menu
const userMenuDivRegex =
  /<div className="relative self-center" ref=\{desktopMenuRef\}>[\s\S]*?<\/div>\n\s*<\/div>/m; // wait, the closing div might match too far
// Instead, let's use string operations:
const searchStr = '<div className="relative self-center" ref={desktopMenuRef}>';
const startUserMenu = content.indexOf(searchStr);
if (startUserMenu !== -1) {
  let depth = 0;
  let endUserMenu = -1;
  for (let i = startUserMenu; i < content.length; i++) {
    if (content.substring(i, i + 4) === "<div") depth++;
    if (content.substring(i, i + 5) === "</div") depth--;
    if (depth === 0) {
      endUserMenu = i + 6; // length of '</div>'
      break;
    }
  }
  if (endUserMenu !== -1) {
    content = content.substring(0, startUserMenu) + content.substring(endUserMenu);
  }
}

// 8. SearchModal and Modal Mobile
const searchModalAndMobileMenuRegex =
  /<SearchModal isOpen=\{isSearchOpen\} onClose=\{\(\) => setIsSearchOpen\(false\)\} \/>[\s\S]*?document\.body\n\s*\)\}/m;
content = content.replace(searchModalAndMobileMenuRegex, "");

// Save
fs.writeFileSync("app/(protected)/_components/layout/navbar.tsx", content);
