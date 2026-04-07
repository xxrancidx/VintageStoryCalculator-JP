<script lang="ts">
  import FeedbackForm from "../components/feedback-form.svelte";
</script>

<section class="feedback-page" aria-labelledby="feedback-heading">
  <div class="feedback-card">
    <h2 id="feedback-heading" class="section-label">フィードバック</h2>
    <p class="feedback-lead">
      バグを発見した、ゲームの数値が間違っている、新しい計算機のアイデアがある？このページから直接フィードバックを送信できます。アカウント不要です。
    </p>
    <p class="feedback-note">
      収集するデータを最小限に抑えるため、必須項目はメッセージのみです。お名前とメールアドレスは任意です。
    </p>
    <FeedbackForm />
  </div>
</section>
