import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ReportModal() {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>신고하기 안내</Text>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>① 지금 상황 요약</Text>
            <Text style={styles.body}>
              로맨스 스캠(연애 사기)으로 판단됩니다.{'\n'}
              {'\n'}
              현재 대화에는 로맨스 스캠의 핵심 패턴이 포함되어 있습니다.{'\n'}
              {'\n'}
              • 신뢰 형성 후 금전/비용을 요구{'\n'}
              • 시간 압박(오늘 처리, 마감 등)으로 결정을 강요{'\n'}
              • 계좌/지갑주소 등 결제 수단으로 유도{'\n'}
              • 입금 확인 집착, 답변 방식 제한 등 심리적 통제 시도{'\n'}
              {'\n'}
              지금 즉시 대응하지 않으면 피해가 확대될 가능성이 큽니다.
            </Text>
          </View>

          <View style={[styles.section, styles.alertSection]}>
            <Text style={styles.sectionTitle}>② 지금 당장 해야 할 행동</Text>
            <Text style={styles.body}>
              아래 항목을 지금 바로 진행하세요.{'\n'}
              {'\n'}
              ⛔ 추가 송금·결제 절대 금지 (소액도 포함){'\n'}
              ⛔ 계좌번호/인증번호/신분증/주소 등 개인정보 제공 즉시 중단{'\n'}
              ✅ 상대방 즉시 차단 (카카오톡 + 연결된 SNS/메신저 전부){'\n'}
              ✅ 대화방·사진·파일·계좌번호 등 증거 삭제 금지{'\n'}
              ✅ 이미 송금했다면: 은행/거래소에 즉시 연락해서 지급정지 요청{'\n'}
              {'\n'}
              “조금만 더 보내면 해결된다”는 말은 2차·3차 피해를 유도하는 전형적인 방식입니다.{'\n'}
              어떤 이유로도 응하지 마세요.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>③ 신고 방법 안내 (한국 기준)</Text>
            <Text style={styles.body}>
              1) 경찰 신고 (필수){'\n'}
              • 국번 없이 182 (경찰청 사이버범죄 신고){'\n'}
              • 온라인 신고: 사이버범죄 신고 시스템{'\n'}
              • 신고 시 제출하면 좋은 것: 대화 캡처(시간 포함), 상대 계좌/지갑주소, 송금 내역{'\n'}
              {'\n'}
              2) 금융기관 신고 (송금/이체 했을 때 최우선){'\n'}
              • 해당 은행 고객센터로 즉시 전화{'\n'}
              • “사기 피해(로맨스 스캠) 의심 거래”로 지급정지/피해구제 요청{'\n'}
              • 가능하면 이체 시각, 금액, 상대 계좌 정보를 함께 전달{'\n'}
              {'\n'}
              3) 가상자산(코인) 보냈을 때{'\n'}
              • 사용한 거래소 고객센터에 즉시 연락{'\n'}
              • TXID(전송 해시), 지갑주소, 시간/금액 제공 후 동결/추적 협조 요청
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>④ 자주 묻는 질문 (FAQ)</Text>
            <Text style={styles.body}>
              Q. 돈을 아직 안 보냈는데 신고해야 하나요?{'\n'}
              → 네. 예방 신고가 가능하며, 동일 계정/계좌 피해 확산을 막는 데 도움이 됩니다.{'\n'}
              {'\n'}
              Q. 상대가 계속 연락하고 협박/회유해요. 어떻게 하죠?{'\n'}
              → 응답하지 말고 차단하세요. 협박·자책 유도는 전형적인 압박 수법입니다.{'\n'}
              {'\n'}
              Q. 이미 돈을 보냈어요. 이제 끝인가요?{'\n'}
              → 끝이 아닙니다. 즉시 은행/거래소에 연락하면 지급정지·동결 가능성이 있습니다. 시간이 핵심입니다.{'\n'}
              {'\n'}
              Q. 신고하면 상대에게 제가 신고한 게 알려지나요?{'\n'}
              → 일반적으로 신고자가 보호되며 상대에게 자동 통보되지 않습니다.
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f8f0eb',
    padding: 16,
    width: '100%',
    height: '78%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5a4b42',
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#f2e6df',
  },
  closeText: {
    fontSize: 12,
    color: '#6b5b52',
  },
  content: {
    gap: 14,
    paddingBottom: 16,
  },
  section: {
    gap: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff7f3',
    borderWidth: 1,
    borderColor: '#efe1d9',
  },
  alertSection: {
    backgroundColor: '#fff1f1',
    borderColor: '#f1b5b5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5f5147',
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    color: '#5a4b42',
  },
});
