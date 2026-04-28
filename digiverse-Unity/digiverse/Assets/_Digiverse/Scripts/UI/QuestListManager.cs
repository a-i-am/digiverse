using UnityEngine;
using UnityEngine.UIElements;
using DigiVerse.UI;
using DigiVerse.Data; // 네임스페이스 추가
using System.Collections.Generic;

namespace DigiVerse.Managers
{
    public class QuestListManager : MonoBehaviour
    {
        [SerializeField] private UIDocument _uiDocument;
        [SerializeField] private VisualTreeAsset _questItemTemplate;

        [Tooltip("에디터에서 생성한 QuestData들을 여기에 드래그해서 넣으세요.")]
        [SerializeField] private List<QuestData> _questDatabase;

        private void Start()
        {
            InitializeQuestList();
        }

        private void InitializeQuestList()
        {
            var root = _uiDocument.rootVisualElement;
            var listContainer = root.Q<VisualElement>("quest-list-container");

            // 하드코딩 배열 삭제! 실제 _questDatabase를 순회하며 UI 생성
            foreach (QuestData questData in _questDatabase)
            {
                VisualElement newQuestItem = _questItemTemplate.Instantiate();
                QuestItemController itemController = new QuestItemController();

                // TODO: 나중에 아이콘 이미지 처리 등도 넘겨주도록 수정 가능
                itemController.Initialize(newQuestItem, questData);

                listContainer.Add(newQuestItem);
            }
        }
    }
}
