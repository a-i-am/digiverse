using UnityEngine;
using UnityEngine.UIElements;
using DigiVerse.UI;

namespace DigiVerse.Managers
{
    /// <summary>
    /// 메인 UI의 퀘스트 리스트 영역을 관리하고, QuestItem들을 생성하여 배치하는 역할
    /// </summary>
    public class QuestListManager : MonoBehaviour
    {
        [Tooltip("화면 전체를 담당하는 UI Document")]
        [SerializeField] private UIDocument _uiDocument;

        [Tooltip("복사해서 쓸 퀘스트 아이템의 뼈대 (QuestItem.uxml)")]
        [SerializeField] private VisualTreeAsset _questItemTemplate;

        private void Start()
        {
            InitializeQuestList();
        }

        private void InitializeQuestList()
        {
            // 1. MainUI에서 우리가 이름 지어둔 ScrollView(빈 공간)를 찾습니다.
            var root = _uiDocument.rootVisualElement;
            var listContainer = root.Q<VisualElement>("quest-list-container");

            // 2. 임시 데이터 (나중에는 Firebase나 로컬 DB에서 가져오게 됩니다)
            string[] dummyQuests = { "일찍 일어나기", "영양제 먹기", "스트레칭", "10분 명상" };

            // 3. 데이터 개수만큼 QuestItem을 복사해서 컨테이너에 붙입니다.
            foreach (var questTitle in dummyQuests)
            {
                // uxml을 기반으로 새 UI 요소를 복제(Instantiate)
                VisualElement newQuestItem = _questItemTemplate.Instantiate();

                // 개별 아이템을 제어할 컨트롤러 생성 및 초기화
                QuestItemController itemController = new QuestItemController();
                itemController.Initialize(newQuestItem, questTitle);

                // 리스트 컨테이너에 추가 (화면에 나타남)
                listContainer.Add(newQuestItem);
            }
        }
    }
}
