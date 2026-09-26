<template>
  <aside class="info-callout">
    <span class="info-icon" aria-hidden="true">ℹ</span>

    <div>
      <strong>À savoir</strong>
      <p><slot /></p>
    </div>
  </aside>
</template>

<style scoped>
.info-callout {
  max-width: 900px;
  padding: 17px 24px 7px 40px;

  position: relative;
  display: flex;

  border-radius: var(--radius-lg);
  background: var(--color-info-soft);
}

.info-callout::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;

  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  background: var(--color-info);
}

.info-icon {
  position: absolute;
  left: 24px;
  color: var(--color-info);
}

strong {
  color: var(--color-info);
  font-size: 14px;
  font-weight: 600;
}

p {
  margin: 10px 0 0;
  max-width: 750px;

  font-size: 16px;
  line-height: 24px;
}

@media (max-width: 768px) {
  .info-callout {
    padding-right: 20px;
  }

  p {
    font-size: 15px;
  }
}
</style>
