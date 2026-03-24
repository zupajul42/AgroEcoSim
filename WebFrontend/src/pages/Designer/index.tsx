import "./style.css";

import { useState } from "preact/hooks";

import { Editor } from "../../components/designer/Editor";
import { Preview } from "../../components/designer/Preview";
import { Timeline } from "../../components/designer/Timeline";

export function Designer() {
    return (
        <div class="designer">
            <Editor />
            <Preview />
            <Timeline />
        </div>
    );
}
