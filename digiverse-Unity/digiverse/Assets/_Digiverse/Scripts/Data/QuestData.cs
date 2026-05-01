using UnityEngine;

namespace DigiVerse.Data
{
    public enum QuestCategory { Focus, Execution, Mental, SelfCare, Creativity }
    public enum QuestDifficulty { E, N, H, EX }
    public enum VerifyType { Self, AI_Explanation, AI_Vision, GPS_Timer, Social_Approval }

    /// <summary>
    /// 개별 퀘스트의 순수 데이터를 담는 ScriptableObject (Data Container)
    /// </summary>
    [CreateAssetMenu(fileName = "NewQuestData", menuName = "DigiVerse/Quest Data")]
    public class QuestData : ScriptableObject
    {
        [Header("기본 정보 (Basic Info)")]
        public string questId;          // 예: "q_001" (나중에 Firebase 연동 시 쓸 고유 키)
        public string questTitle;       // 예: "영양제 먹기"
        public Texture2D questIcon;     // UI Toolkit에 표시할 이미지

        [Header("로직 & 보상 (Logic & Rewards)")]
        public QuestCategory category = QuestCategory.SelfCare;
        public QuestDifficulty difficulty = QuestDifficulty.N;
        public VerifyType verifyType = VerifyType.Self;
        public int rewardValue = 5;     // 오를 스탯 수치
    }
}
