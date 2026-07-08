import TeacherKanjiBookCell from "./TeacherKanjiBookCell";
import TeacherKanjiQueueActions from "./TeacherKanjiQueueActions";
import TeacherKanjiStatusBadge from "./TeacherKanjiStatusBadge";
import TeacherKanjiStudentCell from "./TeacherKanjiStudentCell";
import TeacherKanjiWordCell from "./TeacherKanjiWordCell";

type TeacherKanjiQueueItemProps = {
  studentName: string;
  username: string | null;
  bookTitle: string;
  surface: string;
  reading: string;
  katakanaReading: string;
  vocabularyCacheId: number | null;
  statusLabel: string;
  statusDetail: string;
  statusToneClassName: string;
  flaggedMapRowCount: number;
  isPreparing: boolean;
  isEditorOpen: boolean;
  isIgnoring: boolean;
  onOpenEditor: () => void;
  onClearFlag: () => void;
  onExclude: () => void;
};

export default function TeacherKanjiQueueItem({
  studentName,
  username,
  bookTitle,
  surface,
  reading,
  katakanaReading,
  vocabularyCacheId,
  statusLabel,
  statusDetail,
  statusToneClassName,
  flaggedMapRowCount,
  isPreparing,
  isEditorOpen,
  isIgnoring,
  onOpenEditor,
  onClearFlag,
  onExclude,
}: TeacherKanjiQueueItemProps) {
  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <TeacherKanjiStudentCell
          studentName={studentName}
          username={username}
        />
      </td>

      <td className="px-4 py-4">
        <TeacherKanjiBookCell bookTitle={bookTitle} />
      </td>

      <td className="px-4 py-4">
        <TeacherKanjiWordCell
          surface={surface}
          reading={reading}
          katakanaReading={katakanaReading}
          vocabularyCacheId={vocabularyCacheId}
        />
      </td>

      <td className="px-4 py-4">
        <TeacherKanjiStatusBadge
          label={statusLabel}
          detail={statusDetail}
          toneClassName={statusToneClassName}
        />
      </td>

      <td className="px-4 py-4 text-right">
        <TeacherKanjiQueueActions
          isPreparing={isPreparing}
          isEditorOpen={isEditorOpen}
          isIgnoring={isIgnoring}
          flaggedMapRowCount={flaggedMapRowCount}
          onOpenEditor={onOpenEditor}
          onClearFlag={onClearFlag}
          onExclude={onExclude}
        />
      </td>
    </tr>
  );
}
