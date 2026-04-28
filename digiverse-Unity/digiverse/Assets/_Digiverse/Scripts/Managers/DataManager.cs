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

}
