using UnityEngine;
using UnityEngine.UIElements;

namespace DigiVerse.UI
{
    /// <summary>
    /// 개별 퀘스트 아이템의 슬라이드 토글 로직을 담당하는 컨트롤러
    /// </summary>
    public class QuestItemController
    {
        private VisualElement _root;
        private VisualElement _handle;
        private bool _isCompleted = false;

        public void Initialize(VisualElement root, string title)
        {
            _root = root;
            _root.Q<Label>("quest-title").text = title;

            // 트랙 클릭 시 토글 이벤트 발생
            VisualElement track = _root.Q<VisualElement>("slide-toggle-track");
            track.RegisterCallback<ClickEvent>(OnToggleClicked);
        }

        private void OnToggleClicked(ClickEvent evt)
        {
            _isCompleted = !_isCompleted;

            if (_isCompleted)
            {
                _root.AddToClassList("quest-item-card--completed");
                // TODO: 여기서 퀘스트 완료 사운드 재생 및 Firebase 예비 데이터 갱신
                Debug.Log($"[Quest] {_root.Q<Label>("quest-title").text} 완료!");
            }
            else
            {
                _root.RemoveFromClassList("quest-item-card--completed");
            }
        }
    }
}
