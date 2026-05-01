using System;

namespace DigiVerse.Events
{
    /// <summary>
    /// 퀘스트 관련 시스템 이벤트를 전역에서 관리하는 EventBus 채널
    /// </summary>

    public static class QuestEvents
    {
        // 퀘스트 완료 시 발생되는 이벤트(전달 데이터: 퀘스트ID, 오를 스탯량)
        public static Action<string, int> OnQuestCompleted;
    }
}
