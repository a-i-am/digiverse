using UnityEngine;
using Firebase;
using Firebase.Firestore;
using Firebase.Extensions;
using DigiVerse.Events;
using System.Collections.Generic;

namespace DigiVerse.Managers
{
    /// <summary>
    /// Firebase 초기화 및 Firestore 데이터 읽기/쓰기를 전담하는 매니저
    /// </summary>
    public class DataManager : MonoBehaviour
    {
        private FirebaseFirestore _db;
        private bool _isFirebaseReady = false;

        // 나중에 로그인 시스템이 붙기 전까지 쓸 임시 유저 ID
        private readonly string DUMMY_UID = "test_user_001";

        private void Start()
        {
            // 1. Firebase 초기화 (안드로이드 필수 과정)
            FirebaseApp.CheckAndFixDependenciesAsync().ContinueWithOnMainThread(task =>
            {
                if (task.Result == DependencyStatus.Available)
                {
                    _db = FirebaseFirestore.DefaultInstance;
                    _isFirebaseReady = true;
                    Debug.Log("[Firebase] Firestore 연결 완료!");
                }
                else
                {
                    Debug.LogError($"[Firebase] 연결 실패: {task.Result}");
                }
            });
        }

        private void OnEnable()
        {
            QuestEvents.OnQuestCompleted += HandleQuestCompleted;
        }

        private void OnDisable()
        {
            // 메모리 누수 방지
            QuestEvents.OnQuestCompleted -= HandleQuestCompleted;
        }

        // QuestEvents 이벤트 수신 시 실행될 로직
        private void HandleQuestCompleted(string questId, int rewardValue)
        {
            if (!_isFirebaseReady) return;

            // users/{uid}/quests/{questId}
            DocumentReference docRef = _db.Collection("users").Document(DUMMY_UID).Collection("quests").Document(questId);

            // 서버로 보낼 JSON 형태의 데이터
            Dictionary<string, object> questData = new Dictionary<string, object>
            {
                { "status", "COMPLETED" },
                { "earnedValue", rewardValue },
                { "completedAt", FieldValue.ServerTimestamp } // 서버의 현재 시간 자동 기록
            };

            // Firestore에 쓰기(비동기)
            docRef.SetAsync(questData, SetOptions.MergeAll).ContinueWithOnMainThread(task =>
            {
                if (task.IsCompleted)
                    Debug.Log($"[Firestore] 퀘스트({questId}) 저장 완료! 보상: {rewardValue}");
                else
                    Debug.LogError("[Firestore] 저장 실패!");
            });
        }
    }
}
