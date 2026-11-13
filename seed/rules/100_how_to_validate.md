# 100 · 怎么验证一条规则

> 核心只有一句：**一次只改一个变量，同一模型同一设置，每组多出几张。**

## 一、为什么必须自己出图

规则分两种：

| 类型 | 能不能直接用 |
|---|---|
| **官方文档来的**（A 级） | 可以，但要按模型验证表现 |
| **外部博主说法**（C 级） | **只能当假设**，必须验证 |

C 级能进库，是因为「有依据的假设」比「凭感觉」强；但它是不是真有效，只有出图才知道。

## 二、四个硬条件

1. **同一模型**：不能拿 FLUX 的结论套 Midjourney
2. **同一设置**：种子、步数、尺寸、采样器全部固定
3. **一次只改一个变量**
4. **每组多张**：至少 4 张，1 张说明不了任何事

## 三、A/B 对照法

**问题**：光向写不写 `from camera left`，真的有区别吗？

| 组 | 提示词 | 差异 |
|---|---|---|
| A（对照） | `A portrait of a woman, soft window light, 85mm, f/1.8` | 不写方向 |
| B（实验） | `A portrait of a woman, soft window light **from camera left**, 85mm, f/1.8` | 只加方向 |

两组各出 4 张，共 8 张。逐张检查一件事：**光到底从哪边来**（看鼻影方向、亮面位置）。

**三种结果**

| 结果 | 结论 | 怎么写进库 |
|---|---|---|
| B 组 4 张全部左光，A 组随机 | 规则成立 | 升级为 A 级口径 |
| B 组 2–3 张左光，A 组随机 | 部分有效 | 「写上能提高命中率，但不是保证」 |
| 两组都随机 | **规则无效** | 从库里删掉，或标「已证伪」 |

> 第三种结果也是成果：**证伪比多存十条对规则更有用**。

## 四、完整示例

**验证问题**：`pore-level skin texture with visible pores and fine lines` 比 `smooth skin` 出更多毛孔吗？

**固定条件**：同一模型 / 尺寸 / 种子 / 步数。

**A 组**
```
A close-up portrait of a 30-year-old office worker, clean-shaven, smooth skin,
soft window light from camera left, 85mm lens, f/2.8,
shallow depth of field, Kodak Portra 400 film grain
```

**B 组**（只改皮肤那一句）
```
A close-up portrait of a 30-year-old office worker, clean-shaven,
pore-level skin texture with visible pores and fine lines,
soft window light from camera left, 85mm lens, f/2.8,
shallow depth of field, Kodak Portra 400 film grain
```

**逐张填表**

| 编号 | 有毛孔 | 有细纹 | 像塑料 | 光向 | 看起来几岁 | 备注 |
|---|---|---|---|---|---|---|
| A1 | | | | | | |
| … | | | | | | |
| B4 | | | | | | |

**结论必须带数字**：`B 组 4:0 出现毛孔 → 有效`。说不出数字就是没验证。

## 五、测试设计先查天花板

上一轮实测教训：用 45 岁渔民 + `weathered face` 测皮肤纹理，
结果 A/B 两组 **2:2 无差异**——因为底子已经把纹理推满，再加强只会**过冲**（皱纹密度超出年龄）。

**测之前先问：这个主体的默认状态是什么？我要测的变量真的还有空间吗？**

## 六、懒人版

不想做完整 A/B，就**出图后对着六个崩点看一遍**：构图、光、皮肤、手、文字、其他物体，
把「哪一项崩了」写下来。
一次只验一条规则是理想状态，**能稳定记录崩点就已经在变准了**。
