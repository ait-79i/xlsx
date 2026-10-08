// Small stroke icons, 16px, drawn with currentColor
const Icon = ({ children, size = 16 }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false"
    fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export const UpIcon = () => <Icon><path d="M8 13V3M4 7l4-4 4 4" /></Icon>
export const DownIcon = () => <Icon><path d="M8 3v10M4 9l4 4 4-4" /></Icon>
export const OutIcon = () => <Icon><path d="M10 4H4v6" /><path d="M4 4l8 8" /></Icon>
export const UngroupIcon = () => <Icon><path d="M5 2.5H3.5v11H5M11 2.5h1.5v11H11" /><path d="M6.5 8h3" /></Icon>
export const EyeIcon = ({ off }) => (
  <Icon>
    <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
    <circle cx="8" cy="8" r="2" />
    {off && <path d="M2.5 13.5l11-11" />}
  </Icon>
)
export const UndoIcon = () => <Icon><path d="M5.5 3L2.5 6l3 3" /><path d="M2.5 6h7a4 4 0 010 8H7" /></Icon>
export const CopyIcon = () => <Icon><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5v-2a1 1 0 00-1-1h-6a1 1 0 00-1 1v6a1 1 0 001 1h2" /></Icon>
export const CheckIcon = () => <Icon><path d="M3 8.5l3 3 7-7" /></Icon>
export const DownloadIcon = () => <Icon><path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10" /></Icon>
export const FileIcon = () => (
  <Icon size={20}>
    <path d="M9.5 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5z" />
    <path d="M9.5 1.5V5H13M5.5 8.5h5M5.5 11h5M8 7v6" />
  </Icon>
)
export const CloseIcon = () => <Icon><path d="M4 4l8 8M12 4l-8 8" /></Icon>
export const CaretIcon = ({ open }) => <Icon><path d={open ? 'M4 6l4 4 4-4' : 'M6 4l4 4-4 4'} /></Icon>
export const PencilIcon = () => <Icon><path d="M11 2.5l2.5 2.5L6 12.5H3.5V10z" /><path d="M9.5 4l2.5 2.5" /></Icon>
export const SplitIcon = () => <Icon><path d="M8 2.5v4M8 6.5L4 13M8 6.5l4 6.5" /></Icon>
export const ConcatIcon = () => <Icon><path d="M3 4.5h3.5v7H3M13 4.5H9.5v7H13" /><path d="M6.5 8h3" /></Icon>
export const GripIcon = () => <Icon><circle cx="6" cy="4" r=".6" /><circle cx="10" cy="4" r=".6" /><circle cx="6" cy="8" r=".6" /><circle cx="10" cy="8" r=".6" /><circle cx="6" cy="12" r=".6" /><circle cx="10" cy="12" r=".6" /></Icon>
export const LeftIcon = () => <Icon><path d="M13 8H3M7 4L3 8l4 4" /></Icon>
export const RightIcon = () => <Icon><path d="M3 8h10M9 4l4 4-4 4" /></Icon>
