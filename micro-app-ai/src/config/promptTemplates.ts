export const demoResponses = {
  addBassAndReduceHarshness: `好的，我来帮你调整一下低音和高音！

对于低音，我们可以这样：
<freq_manipulation>
{
  "manipulationType": "add",
  "filterParams": {
    "filterType": "low_shelf",
    "freq": 100,
    "gain": 3,
    "qFactor": 0.7
  }
}
</freq_manipulation>

然后，为了让高音不那么刺耳：
<freq_manipulation>
{
  "manipulationType": "add",
  "filterParams": {
    "filterType": "peaking",
    "freq": 4000,
    "gain": -2.5,
    "qFactor": 1.5
  }
}
</freq_manipulation>

这样调整后，低音会更饱满一些，高频的刺激感也会降低，听起来应该会更舒服哦！😊 你试试看喜不喜欢！`,
};

export const getRandomDemoResponse = (): string => {
  const responses = Object.values(demoResponses);
  if (!responses.length) {
    return '抱歉，我今天好像没什么灵感呢...';
  }
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
};

