"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import styles from './MentionList.module.css';

export default forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.id, label: item.name });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  if (!props.items.length) {
    return <div className={styles.mentionList}>No users found</div>;
  }

  return (
    <div className={styles.mentionList}>
      {props.items.map((item: any, index: number) => (
        <button
          key={item.id}
          className={`${styles.mentionItem} ${index === selectedIndex ? styles.isSelected : ''}`}
          onClick={() => selectItem(index)}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
});
