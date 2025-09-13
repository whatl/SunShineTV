// src/components/HelloWorldInteractiveButton.tsx
"use client"; // <--- 这是关键！告诉 Next.js 这是一个客户端组件。
// HelloWorld 入门代码 (By AI)
import { useState } from 'react';

// 定义从服务器接收的 props 类型
interface Props {
  initialMessage: string;
}
  
  // 这是一个客户端组件 (Client Component)
  export default function HelloWorldInteractiveButton({ initialMessage }: Props) {
    // 这部分代码在浏览器中运行！
    // useState 只能在客户端组件中使用。
    const [count, setCount] = useState(0);
  
    const handleClick = () => {
      setCount(count + 1);
      alert('这个交互发生在浏览器中！');
    };
  
    return (
      <div>
        <h2 className="text-xl font-bold">Hello from the Client!</h2>
        <p className="mt-4">
          这部分内容是可交互的，因为它是一个客户端组件。
        </p>
        <p>
          从服务器接收到的消息: <span className="font-semibold">{initialMessage}</span>
        </p>
        <p className="mt-2">
          你已经点击了 <span className="font-bold text-blue-500">{count}</span> 次。
        </p>
        <button
          onClick={handleClick}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          点我
        </button>
      </div>
    );
  }
